import { getPool } from "../db";
import { v4 as uuidv4 } from "uuid";

export type WritingPrompt = {
  id: string;
  taskType: "task1" | "task2";
  category: string | null;
  level: string | null;
  title: string;
  promptText: string;
  sampleAnswer: string | null;
  keyPoints: string | null; // JSON
  suggestedVocab: string | null; // JSON
  timeLimit: number | null;
  minWords: number | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type WritingTest = {
  id: string;
  title: string;
  description: string | null;
  level: string | null;
  task1PromptId: string | null;
  task2PromptId: string | null;
  totalTimeMinutes: number;
  isActive: boolean;
  isPublic: boolean;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type WritingSubmission = {
  id: string;
  userId: string;
  testTemplateId: string | null; // FK to VtepWritingTests
  testInstanceId: string | null; // FK to Tests (for skill tracking)
  promptId: string | null;
  taskType: "task1" | "task2";
  submittedText: string;
  wordCount: number | null;
  timeSpentSeconds: number | null;
  aiFeedback: string | null; // JSON
  aiScore: number | null;
  scoreTaskAchievement: number | null;
  scoreCoherence: number | null;
  scoreLexical: number | null;
  scoreGrammar: number | null;
  teacherFeedback: string | null;
  teacherScore: number | null;
  gradedByUserId: string | null;
  gradedAt: string | null;
  status: string;
  submittedAt: string;
  updatedAt: string | null;
};

export class VtepWritingRepository {
  // ==================== PROMPTS ====================
  static async createPrompt(input: {
    taskType: "task1" | "task2";
    category?: string | null;
    level?: string | null;
    title: string;
    promptText: string;
    sampleAnswer?: string | null;
    keyPoints?: any;
    suggestedVocab?: any;
    timeLimit?: number | null;
    minWords?: number | null;
    createdByUserId?: string | null;
  }): Promise<{ id: string }> {
    const pool = await getPool();
    const id = uuidv4();
    const now = new Date();

    await pool
      .request()
      .input("Id", id)
      .input("TaskType", input.taskType)
      .input("Category", input.category || null)
      .input("Level", input.level || null)
      .input("Title", input.title)
      .input("PromptText", input.promptText)
      .input("SampleAnswer", input.sampleAnswer || null)
      .input(
        "KeyPoints",
        input.keyPoints ? JSON.stringify(input.keyPoints) : null
      )
      .input(
        "SuggestedVocab",
        input.suggestedVocab ? JSON.stringify(input.suggestedVocab) : null
      )
      .input("TimeLimit", input.timeLimit || null)
      .input("MinWords", input.minWords || null)
      .input("CreatedByUserId", input.createdByUserId || null)
      .input("CreatedAt", now)
      .query(`
        INSERT INTO dbo.VtepWritingPrompts 
        (Id, TaskType, Category, Level, Title, PromptText, SampleAnswer, 
         KeyPoints, SuggestedVocab, TimeLimit, MinWords, CreatedByUserId, CreatedAt)
        VALUES 
        (@Id, @TaskType, @Category, @Level, @Title, @PromptText, @SampleAnswer,
         @KeyPoints, @SuggestedVocab, @TimeLimit, @MinWords, @CreatedByUserId, @CreatedAt)
      `);

    return { id };
  }

  static async listPrompts(filters?: {
    taskType?: "task1" | "task2";
    level?: string;
    category?: string;
    search?: string;
  }): Promise<WritingPrompt[]> {
    const pool = await getPool();
    let whereClause = "WHERE 1=1";
    const request = pool.request();

    if (filters?.taskType) {
      whereClause += " AND TaskType = @TaskType";
      request.input("TaskType", filters.taskType);
    }
    if (filters?.level) {
      whereClause += " AND Level = @Level";
      request.input("Level", filters.level);
    }
    if (filters?.category) {
      whereClause += " AND Category = @Category";
      request.input("Category", filters.category);
    }
    if (filters?.search) {
      whereClause += " AND (Title LIKE @Search OR PromptText LIKE @Search)";
      request.input("Search", `%${filters.search}%`);
    }

    const result = await request.query(`
      SELECT 
        Id as id,
        TaskType as taskType,
        Category as category,
        Level as level,
        Title as title,
        PromptText as promptText,
        SampleAnswer as sampleAnswer,
        KeyPoints as keyPoints,
        SuggestedVocab as suggestedVocab,
        TimeLimit as timeLimit,
        MinWords as minWords,
        CreatedByUserId as createdByUserId,
        CreatedAt as createdAt,
        UpdatedAt as updatedAt
      FROM dbo.VtepWritingPrompts
      ${whereClause}
      ORDER BY CreatedAt DESC
    `);

    return result.recordset;
  }

  static async getPromptById(id: string): Promise<WritingPrompt | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("Id", id)
      .query(`
        SELECT 
          Id as id,
          TaskType as taskType,
          Category as category,
          Level as level,
          Title as title,
          PromptText as promptText,
          SampleAnswer as sampleAnswer,
          KeyPoints as keyPoints,
          SuggestedVocab as suggestedVocab,
          TimeLimit as timeLimit,
          MinWords as minWords,
          CreatedByUserId as createdByUserId,
          CreatedAt as createdAt,
          UpdatedAt as updatedAt
        FROM dbo.VtepWritingPrompts
        WHERE Id = @Id
      `);

    return result.recordset[0] || null;
  }

  static async updatePrompt(
    id: string,
    input: Partial<{
      category: string | null;
      level: string | null;
      title: string;
      promptText: string;
      sampleAnswer: string | null;
      keyPoints: any;
      suggestedVocab: any;
      timeLimit: number | null;
      minWords: number | null;
    }>
  ): Promise<void> {
    const pool = await getPool();
    const now = new Date();
    const request = pool.request().input("Id", id).input("UpdatedAt", now);

    const updates: string[] = ["UpdatedAt = @UpdatedAt"];

    if (input.category !== undefined) {
      updates.push("Category = @Category");
      request.input("Category", input.category);
    }
    if (input.level !== undefined) {
      updates.push("Level = @Level");
      request.input("Level", input.level);
    }
    if (input.title !== undefined) {
      updates.push("Title = @Title");
      request.input("Title", input.title);
    }
    if (input.promptText !== undefined) {
      updates.push("PromptText = @PromptText");
      request.input("PromptText", input.promptText);
    }
    if (input.sampleAnswer !== undefined) {
      updates.push("SampleAnswer = @SampleAnswer");
      request.input("SampleAnswer", input.sampleAnswer);
    }
    if (input.keyPoints !== undefined) {
      updates.push("KeyPoints = @KeyPoints");
      request.input(
        "KeyPoints",
        input.keyPoints ? JSON.stringify(input.keyPoints) : null
      );
    }
    if (input.suggestedVocab !== undefined) {
      updates.push("SuggestedVocab = @SuggestedVocab");
      request.input(
        "SuggestedVocab",
        input.suggestedVocab ? JSON.stringify(input.suggestedVocab) : null
      );
    }
    if (input.timeLimit !== undefined) {
      updates.push("TimeLimit = @TimeLimit");
      request.input("TimeLimit", input.timeLimit);
    }
    if (input.minWords !== undefined) {
      updates.push("MinWords = @MinWords");
      request.input("MinWords", input.minWords);
    }

    await request.query(`
      UPDATE dbo.VtepWritingPrompts
      SET ${updates.join(", ")}
      WHERE Id = @Id
    `);
  }

  static async deletePrompt(id: string): Promise<void> {
    const pool = await getPool();
    
    // First, set NULL for any tests using this prompt
    await pool.request().input("Id", id).query(`
      UPDATE dbo.VtepWritingTests 
      SET Task1PromptId = NULL 
      WHERE Task1PromptId = @Id;
      
      UPDATE dbo.VtepWritingTests 
      SET Task2PromptId = NULL 
      WHERE Task2PromptId = @Id;
    `);
    
    // Then delete the prompt
    await pool.request().input("Id", id).query(`
      DELETE FROM dbo.VtepWritingPrompts WHERE Id = @Id
    `);
  }

  // ==================== TESTS ====================
  static async createTest(input: {
    title: string;
    description?: string | null;
    level?: string | null;
    task1PromptId?: string | null;
    task2PromptId?: string | null;
    totalTimeMinutes?: number;
    isActive?: boolean;
    isPublic?: boolean;
    createdByUserId?: string | null;
  }): Promise<{ id: string }> {
    const pool = await getPool();
    const id = uuidv4();
    const now = new Date();

    // Insert into VtepWritingTests
    await pool
      .request()
      .input("Id", id)
      .input("Title", input.title)
      .input("Description", input.description || null)
      .input("Level", input.level || null)
      .input("Task1PromptId", input.task1PromptId || null)
      .input("Task2PromptId", input.task2PromptId || null)
      .input("TotalTimeMinutes", input.totalTimeMinutes || 60)
      .input("IsActive", input.isActive ?? false)
      .input("IsPublic", input.isPublic ?? true)
      .input("CreatedByUserId", input.createdByUserId || null)
      .input("CreatedAt", now)
      .query(`
        INSERT INTO dbo.VtepWritingTests 
        (Id, Title, Description, Level, Task1PromptId, Task2PromptId, 
         TotalTimeMinutes, IsActive, IsPublic, CreatedByUserId, CreatedAt)
        VALUES 
        (@Id, @Title, @Description, @Level, @Task1PromptId, @Task2PromptId,
         @TotalTimeMinutes, @IsActive, @IsPublic, @CreatedByUserId, @CreatedAt)
      `);

    // Also insert into VtepTests so it appears in test management
    await pool
      .request()
      .input("Id", id)
      .input("Title", input.title)
      .input("Description", input.description || null)
      .input("CreatedByUserId", input.createdByUserId || null)
      .input("IsActive", input.isActive ?? false)
      .input("IsPublic", input.isPublic ?? true)
      .query(`
        INSERT INTO dbo.VtepTests (Id, Title, Description, CreatedByUserId, IsActive, IsPublic, CreatedAt)
        VALUES (@Id, @Title, @Description, @CreatedByUserId, @IsActive, @IsPublic, SYSUTCDATETIME())
      `);

    // Create VtepTestItems for each prompt (Task 1 and/or Task 2)
    let ord = 1;
    
    if (input.task1PromptId) {
      const prompt1 = await this.getPromptById(input.task1PromptId);
      if (prompt1) {
        await pool
          .request()
          .input("Id", uuidv4())
          .input("VtepTestId", id)
          .input("Ord", ord++)
          .input("Prompt", prompt1.promptText)
          .input("OptionsJson", null)
          .input("AnswerJson", JSON.stringify({ 
            taskType: "task1", 
            minWords: prompt1.minWords,
            timeLimit: prompt1.timeLimit,
            keyPoints: prompt1.keyPoints,
            promptId: prompt1.id
          }))
          .input("Part", "Writing")
          .input("Skill", "Writing")
          .input("CreatedByUserId", input.createdByUserId || null)
          .query(`
            INSERT INTO dbo.VtepTestItems 
            (Id, VtepTestId, Ord, Prompt, OptionsJson, AnswerJson, Part, Skill, CreatedByUserId, CreatedAt)
            VALUES (@Id, @VtepTestId, @Ord, @Prompt, @OptionsJson, @AnswerJson, @Part, @Skill, @CreatedByUserId, SYSUTCDATETIME())
          `);
      }
    }

    if (input.task2PromptId) {
      const prompt2 = await this.getPromptById(input.task2PromptId);
      if (prompt2) {
        await pool
          .request()
          .input("Id", uuidv4())
          .input("VtepTestId", id)
          .input("Ord", ord++)
          .input("Prompt", prompt2.promptText)
          .input("OptionsJson", null)
          .input("AnswerJson", JSON.stringify({ 
            taskType: "task2", 
            minWords: prompt2.minWords,
            timeLimit: prompt2.timeLimit,
            keyPoints: prompt2.keyPoints,
            promptId: prompt2.id
          }))
          .input("Part", "Writing")
          .input("Skill", "Writing")
          .input("CreatedByUserId", input.createdByUserId || null)
          .query(`
            INSERT INTO dbo.VtepTestItems 
            (Id, VtepTestId, Ord, Prompt, OptionsJson, AnswerJson, Part, Skill, CreatedByUserId, CreatedAt)
            VALUES (@Id, @VtepTestId, @Ord, @Prompt, @OptionsJson, @AnswerJson, @Part, @Skill, @CreatedByUserId, SYSUTCDATETIME())
          `);
      }
    }

    return { id };
  }

  static async listTests(filters?: {
    level?: string;
    isActive?: boolean;
    isPublic?: boolean;
  }): Promise<WritingTest[]> {
    const pool = await getPool();
    let whereClause = "WHERE 1=1";
    const request = pool.request();

    if (filters?.level) {
      whereClause += " AND Level = @Level";
      request.input("Level", filters.level);
    }
    if (filters?.isActive !== undefined) {
      whereClause += " AND IsActive = @IsActive";
      request.input("IsActive", filters.isActive);
    }
    if (filters?.isPublic !== undefined) {
      whereClause += " AND IsPublic = @IsPublic";
      request.input("IsPublic", filters.isPublic);
    }

    const result = await request.query(`
      SELECT 
        Id as id,
        Title as title,
        Description as description,
        Level as level,
        Task1PromptId as task1PromptId,
        Task2PromptId as task2PromptId,
        TotalTimeMinutes as totalTimeMinutes,
        IsActive as isActive,
        IsPublic as isPublic,
        CreatedByUserId as createdByUserId,
        CreatedAt as createdAt,
        UpdatedAt as updatedAt
      FROM dbo.VtepWritingTests
      ${whereClause}
      ORDER BY CreatedAt DESC
    `);

    return result.recordset;
  }

  static async getTestById(id: string): Promise<WritingTest | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("Id", id)
      .query(`
        SELECT 
          Id as id,
          Title as title,
          Description as description,
          Level as level,
          Task1PromptId as task1PromptId,
          Task2PromptId as task2PromptId,
          TotalTimeMinutes as totalTimeMinutes,
          IsActive as isActive,
          IsPublic as isPublic,
          CreatedByUserId as createdByUserId,
          CreatedAt as createdAt,
          UpdatedAt as updatedAt
        FROM dbo.VtepWritingTests
        WHERE Id = @Id
      `);

    return result.recordset[0] || null;
  }

  static async updateTest(
    id: string,
    input: Partial<{
      title: string;
      description: string | null;
      level: string | null;
      task1PromptId: string | null;
      task2PromptId: string | null;
      totalTimeMinutes: number;
      isActive: boolean;
      isPublic: boolean;
    }>
  ): Promise<void> {
    const pool = await getPool();
    const now = new Date();
    const request = pool.request().input("Id", id).input("UpdatedAt", now);

    const updates: string[] = ["UpdatedAt = @UpdatedAt"];

    if (input.title !== undefined) {
      updates.push("Title = @Title");
      request.input("Title", input.title);
    }
    if (input.description !== undefined) {
      updates.push("Description = @Description");
      request.input("Description", input.description);
    }
    if (input.level !== undefined) {
      updates.push("Level = @Level");
      request.input("Level", input.level);
    }
    if (input.task1PromptId !== undefined) {
      updates.push("Task1PromptId = @Task1PromptId");
      request.input("Task1PromptId", input.task1PromptId);
    }
    if (input.task2PromptId !== undefined) {
      updates.push("Task2PromptId = @Task2PromptId");
      request.input("Task2PromptId", input.task2PromptId);
    }
    if (input.totalTimeMinutes !== undefined) {
      updates.push("TotalTimeMinutes = @TotalTimeMinutes");
      request.input("TotalTimeMinutes", input.totalTimeMinutes);
    }
    if (input.isActive !== undefined) {
      updates.push("IsActive = @IsActive");
      request.input("IsActive", input.isActive);
    }
    if (input.isPublic !== undefined) {
      updates.push("IsPublic = @IsPublic");
      request.input("IsPublic", input.isPublic);
    }

    await request.query(`
      UPDATE dbo.VtepWritingTests
      SET ${updates.join(", ")}
      WHERE Id = @Id
    `);

    // Also update VtepTests for basic fields
    const vtepTestUpdates: string[] = [];
    const vtepRequest = pool.request().input("Id", id);

    if (input.title !== undefined) {
      vtepTestUpdates.push("Title = @Title");
      vtepRequest.input("Title", input.title);
    }
    if (input.description !== undefined) {
      vtepTestUpdates.push("Description = @Description");
      vtepRequest.input("Description", input.description);
    }
    if (input.isActive !== undefined) {
      vtepTestUpdates.push("IsActive = @IsActive");
      vtepRequest.input("IsActive", input.isActive);
    }
    if (input.isPublic !== undefined) {
      vtepTestUpdates.push("IsPublic = @IsPublic");
      vtepRequest.input("IsPublic", input.isPublic);
    }

    if (vtepTestUpdates.length > 0) {
      await vtepRequest.query(`
        UPDATE dbo.VtepTests
        SET ${vtepTestUpdates.join(", ")}
        WHERE Id = @Id
      `);
    }
  }

  static async deleteTest(id: string): Promise<void> {
    const pool = await getPool();
    
    // First, set TestTemplateId to NULL for any submissions using this test
    await pool.request().input("Id", id).query(`
      UPDATE dbo.VtepWritingSubmissions 
      SET TestTemplateId = NULL 
      WHERE TestTemplateId = @Id;
    `);
    
    // Then delete from both VtepWritingTests and VtepTests
    await pool.request().input("Id", id).query(`
      DELETE FROM dbo.VtepWritingTests WHERE Id = @Id;
      DELETE FROM dbo.VtepTests WHERE Id = @Id;
    `);
  }

  // ==================== SUBMISSIONS ====================
  static async createSubmission(input: {
    userId: string;
    testTemplateId?: string | null;
    testInstanceId?: string | null;
    promptId?: string | null;
    taskType: "task1" | "task2";
    submittedText: string;
    wordCount?: number | null;
    timeSpentSeconds?: number | null;
    status?: string;
  }): Promise<{ id: string }> {
    const pool = await getPool();
    const id = uuidv4();
    const now = new Date();

    await pool
      .request()
      .input("Id", id)
      .input("UserId", input.userId)
      .input("TestTemplateId", input.testTemplateId || null)
      .input("TestInstanceId", input.testInstanceId || null)
      .input("PromptId", input.promptId || null)
      .input("TaskType", input.taskType)
      .input("SubmittedText", input.submittedText)
      .input("WordCount", input.wordCount || null)
      .input("TimeSpentSeconds", input.timeSpentSeconds || null)
      .input("Status", input.status || "submitted")
      .input("SubmittedAt", now)
      .query(`
        INSERT INTO dbo.VtepWritingSubmissions 
        (Id, UserId, TestTemplateId, TestInstanceId, PromptId, TaskType, SubmittedText, 
         WordCount, TimeSpentSeconds, Status, SubmittedAt)
        VALUES 
        (@Id, @UserId, @TestTemplateId, @TestInstanceId, @PromptId, @TaskType, @SubmittedText,
         @WordCount, @TimeSpentSeconds, @Status, @SubmittedAt)
      `);

    return { id };
  }

  static async updateSubmissionGrade(
    id: string,
    grade: {
      aiFeedback?: any;
      aiScore?: number;
      scoreTaskAchievement?: number;
      scoreCoherence?: number;
      scoreLexical?: number;
      scoreGrammar?: number;
    }
  ): Promise<void> {
    const pool = await getPool();
    const now = new Date();

    await pool
      .request()
      .input("Id", id)
      .input(
        "AiFeedback",
        grade.aiFeedback ? JSON.stringify(grade.aiFeedback) : null
      )
      .input("AiScore", grade.aiScore || null)
      .input("ScoreTaskAchievement", grade.scoreTaskAchievement || null)
      .input("ScoreCoherence", grade.scoreCoherence || null)
      .input("ScoreLexical", grade.scoreLexical || null)
      .input("ScoreGrammar", grade.scoreGrammar || null)
      .input("Status", "graded")
      .input("UpdatedAt", now)
      .query(`
        UPDATE dbo.VtepWritingSubmissions
        SET 
          AiFeedback = @AiFeedback,
          AiScore = @AiScore,
          ScoreTaskAchievement = @ScoreTaskAchievement,
          ScoreCoherence = @ScoreCoherence,
          ScoreLexical = @ScoreLexical,
          ScoreGrammar = @ScoreGrammar,
          Status = @Status,
          UpdatedAt = @UpdatedAt
        WHERE Id = @Id
      `);
  }

  static async listUserSubmissions(userId: string): Promise<WritingSubmission[]> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("UserId", userId)
      .query(`
        SELECT 
          s.Id as id,
          s.UserId as userId,
          s.TestTemplateId as testTemplateId,
          s.TestInstanceId as testInstanceId,
          s.PromptId as promptId,
          s.TaskType as taskType,
          s.SubmittedText as submittedText,
          s.WordCount as wordCount,
          s.TimeSpentSeconds as timeSpentSeconds,
          s.AiFeedback as aiFeedback,
          s.AiScore as aiScore,
          s.ScoreTaskAchievement as scoreTaskAchievement,
          s.ScoreCoherence as scoreCoherence,
          s.ScoreLexical as scoreLexical,
          s.ScoreGrammar as scoreGrammar,
          s.TeacherFeedback as teacherFeedback,
          s.TeacherScore as teacherScore,
          s.GradedByUserId as gradedByUserId,
          s.GradedAt as gradedAt,
          s.Status as status,
          s.SubmittedAt as submittedAt,
          s.SubmittedAt as createdAt,
          s.UpdatedAt as updatedAt,
          p.Title as promptTitle,
          p.Level as promptLevel
        FROM dbo.VtepWritingSubmissions s
        LEFT JOIN dbo.VtepWritingPrompts p ON s.PromptId = p.Id
        WHERE s.UserId = @UserId
        ORDER BY s.SubmittedAt DESC
      `);

    return result.recordset;
  }

  static async getSubmissionById(id: string): Promise<WritingSubmission | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("Id", id)
      .query(`
        SELECT 
          Id as id,
          UserId as userId,
          TestTemplateId as testTemplateId,
          TestInstanceId as testInstanceId,
          PromptId as promptId,
          TaskType as taskType,
          SubmittedText as submittedText,
          WordCount as wordCount,
          TimeSpentSeconds as timeSpentSeconds,
          AiFeedback as aiFeedback,
          AiScore as aiScore,
          ScoreTaskAchievement as scoreTaskAchievement,
          ScoreCoherence as scoreCoherence,
          ScoreLexical as scoreLexical,
          ScoreGrammar as scoreGrammar,
          TeacherFeedback as teacherFeedback,
          TeacherScore as teacherScore,
          GradedByUserId as gradedByUserId,
          GradedAt as gradedAt,
          Status as status,
          SubmittedAt as submittedAt,
          UpdatedAt as updatedAt
        FROM dbo.VtepWritingSubmissions
        WHERE Id = @Id
      `);

    return result.recordset[0] || null;
  }
}
