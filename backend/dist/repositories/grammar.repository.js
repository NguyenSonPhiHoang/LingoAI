"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GrammarRepository = void 0;
const db_1 = require("../db");
const uuid_1 = require("uuid");
class GrammarRepository {
    static async listPublished() {
        const pool = await (0, db_1.getPool)();
        const result = await pool.request().query(`
      SELECT
        l.Id as id,
        l.Title as title,
        l.Level as level,
        l.Topic as topic,
        l.IsPublished as isPublished,
        l.CreatedAt as createdAt,
        l.UpdatedAt as updatedAt,
        (SELECT COUNT(1) FROM dbo.GrammarExercises e WHERE e.LessonId = l.Id) as exerciseCount
      FROM dbo.GrammarLessons l
      WHERE l.IsPublished = 1
      ORDER BY l.Level ASC, l.UpdatedAt DESC
    `);
        return result.recordset || [];
    }
    static async getPublishedLessonDetail(id) {
        const pool = await (0, db_1.getPool)();
        const lessonRes = await pool.request().input("Id", id).query(`
        SELECT TOP 1
          Id as id,
          Title as title,
          Level as level,
          Topic as topic,
          ContentMarkdown as contentMarkdown,
          ResourcesJson as resourcesJson
        FROM dbo.GrammarLessons
        WHERE Id = @Id AND IsPublished = 1
      `);
        const lessonRaw = lessonRes.recordset?.[0];
        if (!lessonRaw)
            return null;
        const lesson = { ...lessonRaw };
        try {
            lesson.resources = lessonRaw.resourcesJson
                ? JSON.parse(lessonRaw.resourcesJson)
                : [];
        }
        catch {
            lesson.resources = [];
        }
        const exRes = await pool.request().input("LessonId", id).query(`
        SELECT
          Id as id,
          Type as type,
          Prompt as prompt,
          OptionsJson as optionsJson,
          AnswerJson as answerJson,
          Explanation as explanation,
          Points as points,
          SortOrder as sortOrder
        FROM dbo.GrammarExercises
        WHERE LessonId = @LessonId
        ORDER BY SortOrder ASC, CreatedAt ASC
      `);
        return {
            ...lesson,
            exercises: exRes.recordset || [],
        };
    }
    static async getLessonDetail(id) {
        const pool = await (0, db_1.getPool)();
        const lessonRes = await pool.request().input("Id", id).query(`
        SELECT TOP 1
          Id as id,
          Title as title,
          Level as level,
          Topic as topic,
          ContentMarkdown as contentMarkdown,
          ResourcesJson as resourcesJson
        FROM dbo.GrammarLessons
        WHERE Id = @Id
      `);
        const lessonRaw = lessonRes.recordset?.[0];
        if (!lessonRaw)
            return null;
        const lesson = { ...lessonRaw };
        try {
            lesson.resources = lessonRaw.resourcesJson
                ? JSON.parse(lessonRaw.resourcesJson)
                : [];
        }
        catch {
            lesson.resources = [];
        }
        const exRes = await pool.request().input("LessonId", id).query(`
        SELECT
          Id as id,
          Type as type,
          Prompt as prompt,
          OptionsJson as optionsJson,
          Explanation as explanation,
          Points as points,
          SortOrder as sortOrder
        FROM dbo.GrammarExercises
        WHERE LessonId = @LessonId
        ORDER BY SortOrder ASC, CreatedAt ASC
      `);
        return {
            ...lesson,
            exercises: exRes.recordset || [],
        };
    }
    static async getExercisesForGrading(lessonId) {
        const pool = await (0, db_1.getPool)();
        const exRes = await pool.request().input("LessonId", lessonId).query(`
        SELECT
          Id as id,
          Type as type,
          Prompt as prompt,
          OptionsJson as optionsJson,
          AnswerJson as answerJson,
          Explanation as explanation,
          Points as points,
          SortOrder as sortOrder
        FROM dbo.GrammarExercises
        WHERE LessonId = @LessonId
        ORDER BY SortOrder ASC, CreatedAt ASC
      `);
        return exRes.recordset || [];
    }
    static async createLesson(input) {
        const pool = await (0, db_1.getPool)();
        const id = (0, uuid_1.v4)();
        await pool
            .request()
            .input("Id", id)
            .input("Title", input.title)
            .input("Level", input.level)
            .input("Topic", input.topic || null)
            .input("ContentMarkdown", input.contentMarkdown)
            .input("ResourcesJson", typeof input.resources === "undefined"
            ? null
            : JSON.stringify(input.resources))
            .input("IsPublished", input.isPublished ?? true)
            .input("CreatedByUserId", input.createdByUserId || null).query(`
        INSERT INTO dbo.GrammarLessons (Id, Title, Level, Topic, ContentMarkdown, ResourcesJson, IsPublished, CreatedByUserId)
        VALUES (@Id, @Title, @Level, @Topic, @ContentMarkdown, @ResourcesJson, @IsPublished, @CreatedByUserId)
      `);
        return { id };
    }
    static async updateLesson(input) {
        const pool = await (0, db_1.getPool)();
        // Build partial update - only update provided fields
        const sets = [];
        const req = pool.request().input("Id", input.id);
        if (typeof input.title !== "undefined") {
            req.input("Title", input.title);
            sets.push("Title = @Title");
        }
        if (typeof input.level !== "undefined") {
            req.input("Level", input.level);
            sets.push("Level = @Level");
        }
        if (typeof input.topic !== "undefined") {
            req.input("Topic", input.topic);
            sets.push("Topic = @Topic");
        }
        if (typeof input.contentMarkdown !== "undefined") {
            req.input("ContentMarkdown", input.contentMarkdown);
            sets.push("ContentMarkdown = @ContentMarkdown");
        }
        if (typeof input.resourcesJson !== "undefined") {
            req.input("ResourcesJson", input.resourcesJson === null
                ? null
                : JSON.stringify(input.resourcesJson));
            sets.push("ResourcesJson = @ResourcesJson");
        }
        if (typeof input.isPublished !== "undefined") {
            req.input("IsPublished", input.isPublished ? 1 : 0);
            sets.push("IsPublished = @IsPublished");
        }
        if (sets.length === 0)
            return;
        const sql = `UPDATE dbo.GrammarLessons SET ${sets.join(", ")}, UpdatedAt = SYSUTCDATETIME() WHERE Id = @Id`;
        await req.query(sql);
    }
    static async upsertExercises(lessonId, exercises) {
        const pool = await (0, db_1.getPool)();
        for (const ex of exercises) {
            const exId = ex.id || (0, uuid_1.v4)();
            const optionsJson = typeof ex.optionsJson === "undefined"
                ? null
                : JSON.stringify(ex.optionsJson);
            const answerJson = JSON.stringify(ex.answerJson);
            await pool
                .request()
                .input("Id", exId)
                .input("LessonId", lessonId)
                .input("Type", ex.type)
                .input("Prompt", ex.prompt)
                .input("OptionsJson", optionsJson)
                .input("AnswerJson", answerJson)
                .input("Explanation", ex.explanation || null)
                .input("Points", ex.points ?? 1)
                .input("SortOrder", ex.sortOrder ?? 0).query(`
          MERGE dbo.GrammarExercises AS target
          USING (SELECT @Id as Id) AS source
          ON target.Id = source.Id
          WHEN MATCHED THEN
            UPDATE SET
              LessonId = @LessonId,
              Type = @Type,
              Prompt = @Prompt,
              OptionsJson = @OptionsJson,
              AnswerJson = @AnswerJson,
              Explanation = @Explanation,
              Points = @Points,
              SortOrder = @SortOrder,
              UpdatedAt = SYSUTCDATETIME()
          WHEN NOT MATCHED THEN
            INSERT (Id, LessonId, Type, Prompt, OptionsJson, AnswerJson, Explanation, Points, SortOrder)
            VALUES (@Id, @LessonId, @Type, @Prompt, @OptionsJson, @AnswerJson, @Explanation, @Points, @SortOrder);
        `);
        }
    }
    static async createAttempt(input) {
        const pool = await (0, db_1.getPool)();
        const attemptId = (0, uuid_1.v4)();
        // Use mssql transaction API (db.ts uses a dynamic require).
        const mssql = require("mssql");
        const tx = new mssql.Transaction(pool);
        await tx.begin();
        try {
            await new mssql.Request(tx)
                .input("Id", attemptId)
                .input("UserId", input.userId)
                .input("LessonId", input.lessonId)
                .input("Score", input.score)
                .input("MaxScore", input.maxScore).query(`
          INSERT INTO dbo.GrammarAttempts (Id, UserId, LessonId, Score, MaxScore)
          VALUES (@Id, @UserId, @LessonId, @Score, @MaxScore)
        `);
            for (const a of input.answers) {
                await new mssql.Request(tx)
                    .input("AttemptId", attemptId)
                    .input("ExerciseId", a.exerciseId)
                    .input("UserAnswerJson", a.userAnswerJson)
                    .input("IsCorrect", a.isCorrect)
                    .input("Score", a.score)
                    .input("Points", a.points).query(`
            INSERT INTO dbo.GrammarAttemptAnswers (AttemptId, ExerciseId, UserAnswerJson, IsCorrect, Score, Points)
            VALUES (@AttemptId, @ExerciseId, @UserAnswerJson, @IsCorrect, @Score, @Points)
          `);
            }
            await tx.commit();
            return { id: attemptId };
        }
        catch (err) {
            await tx.rollback();
            throw err;
        }
    }
}
exports.GrammarRepository = GrammarRepository;
