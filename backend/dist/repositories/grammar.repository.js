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
          ContentMarkdown as contentMarkdown
        FROM dbo.GrammarLessons
        WHERE Id = @Id AND IsPublished = 1
      `);
        const lesson = lessonRes.recordset?.[0];
        if (!lesson)
            return null;
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
            .input("IsPublished", input.isPublished ?? true)
            .input("CreatedByUserId", input.createdByUserId || null).query(`
        INSERT INTO dbo.GrammarLessons (Id, Title, Level, Topic, ContentMarkdown, IsPublished, CreatedByUserId)
        VALUES (@Id, @Title, @Level, @Topic, @ContentMarkdown, @IsPublished, @CreatedByUserId)
      `);
        return { id };
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
