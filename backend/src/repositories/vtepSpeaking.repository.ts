import { getPool } from "../db";
import { v4 as uuidv4 } from "uuid";

export type SpeakingPrompt = {
  id: string;
  partNumber: 1 | 2 | 3;
  category: string | null;
  level: string | null;
  title: string;
  promptText: string;
  cueCardBullets: string | null; // JSON array for Part 2
  preparationTime: number | null;
  speakingTime: number | null;
  sampleAnswer: string | null;
  keyVocabulary: string | null; // JSON
  usefulPhrases: string | null; // JSON
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type SpeakingTest = {
  id: string;
  title: string;
  description: string | null;
  level: string | null;
  part1PromptIds: string | null; // JSON array
  part2PromptId: string | null;
  part3PromptIds: string | null; // JSON array
  totalTimeMinutes: number;
  isActive: boolean;
  isPublic: boolean;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string | null;
};

export type SpeakingSubmission = {
  id: string;
  userId: string;
  testId: string | null;
  promptId: string | null;
  partNumber: 1 | 2 | 3;
  audioUrl: string | null;
  durationSeconds: number | null;
  transcribedText: string | null;
  transcriptionConfidence: number | null;
  aiFeedback: string | null; // JSON
  aiScore: number | null;
  scoreFluency: number | null;
  scoreLexical: number | null;
  scoreGrammar: number | null;
  scorePronunciation: number | null;
  teacherFeedback: string | null;
  teacherScore: number | null;
  gradedByUserId: string | null;
  gradedAt: string | null;
  status: string;
  submittedAt: string;
  updatedAt: string | null;
};

export class VtepSpeakingRepository {
  // ==================== PROMPTS ====================
  
  static async createPrompt(input: {
    partNumber: 1 | 2 | 3;
    category?: string | null;
    level?: string | null;
    title: string;
    promptText: string;
    cueCardBullets?: any; // Array for Part 2
    preparationTime?: number | null;
    speakingTime?: number | null;
    sampleAnswer?: string | null;
    keyVocabulary?: any;
    usefulPhrases?: any;
    createdByUserId?: string | null;
  }): Promise<{ id: string }> {
    const pool = await getPool();
    const id = uuidv4();
    const now = new Date();

    await pool
      .request()
      .input("Id", id)
      .input("PartNumber", input.partNumber)
      .input("Category", input.category || null)
      .input("Level", input.level || null)
      .input("Title", input.title)
      .input("PromptText", input.promptText)
      .input(
        "CueCardBullets",
        input.cueCardBullets ? JSON.stringify(input.cueCardBullets) : null
      )
      .input("PreparationTime", input.preparationTime || null)
      .input("SpeakingTime", input.speakingTime || null)
      .input("SampleAnswer", input.sampleAnswer || null)
      .input(
        "KeyVocabulary",
        input.keyVocabulary ? JSON.stringify(input.keyVocabulary) : null
      )
      .input(
        "UsefulPhrases",
        input.usefulPhrases ? JSON.stringify(input.usefulPhrases) : null
      )
      .input("CreatedByUserId", input.createdByUserId || null)
      .input("CreatedAt", now)
      .query(`
        INSERT INTO dbo.VtepSpeakingPrompts 
        (Id, PartNumber, Category, Level, Title, PromptText, CueCardBullets,
         PreparationTime, SpeakingTime, SampleAnswer, KeyVocabulary, UsefulPhrases,
         CreatedByUserId, CreatedAt)
        VALUES 
        (@Id, @PartNumber, @Category, @Level, @Title, @PromptText, @CueCardBullets,
         @PreparationTime, @SpeakingTime, @SampleAnswer, @KeyVocabulary, @UsefulPhrases,
         @CreatedByUserId, @CreatedAt)
      `);

    return { id };
  }

  static async listPrompts(filters?: {
    partNumber?: 1 | 2 | 3;
    level?: string;
    category?: string;
    search?: string;
  }): Promise<SpeakingPrompt[]> {
    const pool = await getPool();
    let whereClause = "WHERE 1=1";
    const request = pool.request();

    if (filters?.partNumber) {
      whereClause += " AND PartNumber = @PartNumber";
      request.input("PartNumber", filters.partNumber);
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
        PartNumber as partNumber,
        Category as category,
        Level as level,
        Title as title,
        PromptText as promptText,
        CueCardBullets as cueCardBullets,
        PreparationTime as preparationTime,
        SpeakingTime as speakingTime,
        SampleAnswer as sampleAnswer,
        KeyVocabulary as keyVocabulary,
        UsefulPhrases as usefulPhrases,
        CreatedByUserId as createdByUserId,
        CreatedAt as createdAt,
        UpdatedAt as updatedAt
      FROM dbo.VtepSpeakingPrompts
      ${whereClause}
      ORDER BY PartNumber ASC, CreatedAt DESC
    `);

    return result.recordset;
  }

  static async getPromptById(id: string): Promise<SpeakingPrompt | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("Id", id)
      .query(`
        SELECT 
          Id as id,
          PartNumber as partNumber,
          Category as category,
          Level as level,
          Title as title,
          PromptText as promptText,
          CueCardBullets as cueCardBullets,
          PreparationTime as preparationTime,
          SpeakingTime as speakingTime,
          SampleAnswer as sampleAnswer,
          KeyVocabulary as keyVocabulary,
          UsefulPhrases as usefulPhrases,
          CreatedByUserId as createdByUserId,
          CreatedAt as createdAt,
          UpdatedAt as updatedAt
        FROM dbo.VtepSpeakingPrompts
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
      cueCardBullets: any;
      preparationTime: number | null;
      speakingTime: number | null;
      sampleAnswer: string | null;
      keyVocabulary: any;
      usefulPhrases: any;
    }>
  ): Promise<void> {
    const pool = await getPool();
    const now = new Date();
    const request = pool.request().input("Id", id).input("UpdatedAt", now);

    const setClauses: string[] = ["UpdatedAt = @UpdatedAt"];

    if (input.category !== undefined) {
      setClauses.push("Category = @Category");
      request.input("Category", input.category);
    }
    if (input.level !== undefined) {
      setClauses.push("Level = @Level");
      request.input("Level", input.level);
    }
    if (input.title !== undefined) {
      setClauses.push("Title = @Title");
      request.input("Title", input.title);
    }
    if (input.promptText !== undefined) {
      setClauses.push("PromptText = @PromptText");
      request.input("PromptText", input.promptText);
    }
    if (input.cueCardBullets !== undefined) {
      setClauses.push("CueCardBullets = @CueCardBullets");
      request.input(
        "CueCardBullets",
        input.cueCardBullets ? JSON.stringify(input.cueCardBullets) : null
      );
    }
    if (input.preparationTime !== undefined) {
      setClauses.push("PreparationTime = @PreparationTime");
      request.input("PreparationTime", input.preparationTime);
    }
    if (input.speakingTime !== undefined) {
      setClauses.push("SpeakingTime = @SpeakingTime");
      request.input("SpeakingTime", input.speakingTime);
    }
    if (input.sampleAnswer !== undefined) {
      setClauses.push("SampleAnswer = @SampleAnswer");
      request.input("SampleAnswer", input.sampleAnswer);
    }
    if (input.keyVocabulary !== undefined) {
      setClauses.push("KeyVocabulary = @KeyVocabulary");
      request.input(
        "KeyVocabulary",
        input.keyVocabulary ? JSON.stringify(input.keyVocabulary) : null
      );
    }
    if (input.usefulPhrases !== undefined) {
      setClauses.push("UsefulPhrases = @UsefulPhrases");
      request.input(
        "UsefulPhrases",
        input.usefulPhrases ? JSON.stringify(input.usefulPhrases) : null
      );
    }

    if (setClauses.length > 1) {
      await request.query(`
        UPDATE dbo.VtepSpeakingPrompts
        SET ${setClauses.join(", ")}
        WHERE Id = @Id
      `);
    }
  }

  static async deletePrompt(id: string): Promise<void> {
    const pool = await getPool();
    await pool.request().input("Id", id).query(`
      DELETE FROM dbo.VtepSpeakingPrompts WHERE Id = @Id
    `);
  }

  // ==================== TESTS ====================

  static async createTest(input: {
    title: string;
    description?: string | null;
    level?: string | null;
    part1PromptIds?: string[]; // Array of IDs
    part2PromptId?: string | null;
    part3PromptIds?: string[]; // Array of IDs
    totalTimeMinutes?: number;
    isActive?: boolean;
    isPublic?: boolean;
    documentId?: string | null;
    createdByUserId?: string | null;
  }): Promise<{ id: string }> {
    const pool = await getPool();
    const id = uuidv4();
    const now = new Date();

    await pool
      .request()
      .input("Id", id)
      .input("Title", input.title)
      .input("Description", input.description || null)
      .input("Level", input.level || null)
      .input(
        "Part1PromptIds",
        input.part1PromptIds ? JSON.stringify(input.part1PromptIds) : null
      )
      .input("Part2PromptId", input.part2PromptId || null)
      .input(
        "Part3PromptIds",
        input.part3PromptIds ? JSON.stringify(input.part3PromptIds) : null
      )
      .input("TotalTimeMinutes", input.totalTimeMinutes || 15)
      .input("IsActive", input.isActive ? 1 : 0)
      .input("IsPublic", input.isPublic ? 1 : 0)
      .input("DocumentId", input.documentId || null)
      .input("CreatedByUserId", input.createdByUserId || null)
      .input("CreatedAt", now)
      .query(`
        INSERT INTO dbo.VtepSpeakingTests 
        (Id, Title, Description, Level, Part1PromptIds, Part2PromptId, Part3PromptIds,
         TotalTimeMinutes, IsActive, IsPublic, DocumentId, CreatedByUserId, CreatedAt)
        VALUES 
        (@Id, @Title, @Description, @Level, @Part1PromptIds, @Part2PromptId, @Part3PromptIds,
         @TotalTimeMinutes, @IsActive, @IsPublic, @DocumentId, @CreatedByUserId, @CreatedAt)
      `);

    return { id };
  }

  static async listTests(filters?: {
    level?: string;
    isActive?: boolean;
    isPublic?: boolean;
  }): Promise<SpeakingTest[]> {
    const pool = await getPool();
    let whereClause = "WHERE 1=1";
    const request = pool.request();

    if (filters?.level) {
      whereClause += " AND Level = @Level";
      request.input("Level", filters.level);
    }
    if (filters?.isActive !== undefined) {
      whereClause += " AND IsActive = @IsActive";
      request.input("IsActive", filters.isActive ? 1 : 0);
    }
    if (filters?.isPublic !== undefined) {
      whereClause += " AND IsPublic = @IsPublic";
      request.input("IsPublic", filters.isPublic ? 1 : 0);
    }

    const result = await request.query(`
      SELECT 
        Id as id,
        Title as title,
        Description as description,
        Level as level,
        Part1PromptIds as part1PromptIds,
        Part2PromptId as part2PromptId,
        Part3PromptIds as part3PromptIds,
        TotalTimeMinutes as totalTimeMinutes,
        IsActive as isActive,
        IsPublic as isPublic,
        CreatedByUserId as createdByUserId,
        CreatedAt as createdAt,
        UpdatedAt as updatedAt
      FROM dbo.VtepSpeakingTests
      ${whereClause}
      ORDER BY CreatedAt DESC
    `);

    return result.recordset;
  }

  static async getTestById(id: string): Promise<SpeakingTest | null> {
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
          Part1PromptIds as part1PromptIds,
          Part2PromptId as part2PromptId,
          Part3PromptIds as part3PromptIds,
          TotalTimeMinutes as totalTimeMinutes,
          IsActive as isActive,
          IsPublic as isPublic,
          CreatedByUserId as createdByUserId,
          CreatedAt as createdAt,
          UpdatedAt as updatedAt
        FROM dbo.VtepSpeakingTests
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
      part1PromptIds: string[];
      part2PromptId: string | null;
      part3PromptIds: string[];
      totalTimeMinutes: number;
      isActive: boolean;
      isPublic: boolean;
    }>
  ): Promise<void> {
    const pool = await getPool();
    const now = new Date();
    const request = pool.request().input("Id", id).input("UpdatedAt", now);

    const setClauses: string[] = ["UpdatedAt = @UpdatedAt"];

    if (input.title !== undefined) {
      setClauses.push("Title = @Title");
      request.input("Title", input.title);
    }
    if (input.description !== undefined) {
      setClauses.push("Description = @Description");
      request.input("Description", input.description);
    }
    if (input.level !== undefined) {
      setClauses.push("Level = @Level");
      request.input("Level", input.level);
    }
    if (input.part1PromptIds !== undefined) {
      setClauses.push("Part1PromptIds = @Part1PromptIds");
      request.input("Part1PromptIds", JSON.stringify(input.part1PromptIds));
    }
    if (input.part2PromptId !== undefined) {
      setClauses.push("Part2PromptId = @Part2PromptId");
      request.input("Part2PromptId", input.part2PromptId);
    }
    if (input.part3PromptIds !== undefined) {
      setClauses.push("Part3PromptIds = @Part3PromptIds");
      request.input("Part3PromptIds", JSON.stringify(input.part3PromptIds));
    }
    if (input.totalTimeMinutes !== undefined) {
      setClauses.push("TotalTimeMinutes = @TotalTimeMinutes");
      request.input("TotalTimeMinutes", input.totalTimeMinutes);
    }
    if (input.isActive !== undefined) {
      setClauses.push("IsActive = @IsActive");
      request.input("IsActive", input.isActive ? 1 : 0);
    }
    if (input.isPublic !== undefined) {
      setClauses.push("IsPublic = @IsPublic");
      request.input("IsPublic", input.isPublic ? 1 : 0);
    }

    if (setClauses.length > 1) {
      await request.query(`
        UPDATE dbo.VtepSpeakingTests
        SET ${setClauses.join(", ")}
        WHERE Id = @Id
      `);
    }
  }

  static async deleteTest(id: string): Promise<void> {
    const pool = await getPool();
    await pool.request().input("Id", id).query(`
      DELETE FROM dbo.VtepSpeakingTests WHERE Id = @Id
    `);
  }

  // ==================== SUBMISSIONS ====================

  static async createSubmission(input: {
    userId: string;
    testId?: string | null;
    promptId?: string | null;
    partNumber: 1 | 2 | 3;
    audioUrl?: string | null;
    durationSeconds?: number | null;
    transcribedText?: string | null;
    transcriptionConfidence?: number | null;
  }): Promise<{ id: string }> {
    const pool = await getPool();
    const id = uuidv4();
    const now = new Date();

    await pool
      .request()
      .input("Id", id)
      .input("UserId", input.userId)
      .input("TestId", input.testId || null)
      .input("PromptId", input.promptId || null)
      .input("PartNumber", input.partNumber)
      .input("AudioUrl", input.audioUrl || null)
      .input("DurationSeconds", input.durationSeconds || null)
      .input("TranscribedText", input.transcribedText || null)
      .input("TranscriptionConfidence", input.transcriptionConfidence || null)
      .input("SubmittedAt", now)
      .query(`
        INSERT INTO dbo.VtepSpeakingSubmissions 
        (Id, UserId, TestId, PromptId, PartNumber, AudioUrl, DurationSeconds,
         TranscribedText, TranscriptionConfidence, Status, SubmittedAt)
        VALUES 
        (@Id, @UserId, @TestId, @PromptId, @PartNumber, @AudioUrl, @DurationSeconds,
         @TranscribedText, @TranscriptionConfidence, 'submitted', @SubmittedAt)
      `);

    return { id };
  }

  static async listSubmissions(filters?: {
    userId?: string;
    testId?: string;
    status?: string;
  }): Promise<SpeakingSubmission[]> {
    const pool = await getPool();
    let whereClause = "WHERE 1=1";
    const request = pool.request();

    if (filters?.userId) {
      whereClause += " AND UserId = @UserId";
      request.input("UserId", filters.userId);
    }
    if (filters?.testId) {
      whereClause += " AND TestId = @TestId";
      request.input("TestId", filters.testId);
    }
    if (filters?.status) {
      whereClause += " AND Status = @Status";
      request.input("Status", filters.status);
    }

    const result = await request.query(`
      SELECT 
        Id as id, UserId as userId, TestId as testId, PromptId as promptId,
        PartNumber as partNumber, AudioUrl as audioUrl, DurationSeconds as durationSeconds,
        TranscribedText as transcribedText, TranscriptionConfidence as transcriptionConfidence,
        AiFeedback as aiFeedback, AiScore as aiScore,
        ScoreFluency as scoreFluency, ScoreLexical as scoreLexical,
        ScoreGrammar as scoreGrammar, ScorePronunciation as scorePronunciation,
        TeacherFeedback as teacherFeedback, TeacherScore as teacherScore,
        GradedByUserId as gradedByUserId, GradedAt as gradedAt,
        Status as status, SubmittedAt as submittedAt, UpdatedAt as updatedAt
      FROM dbo.VtepSpeakingSubmissions
      ${whereClause}
      ORDER BY SubmittedAt DESC
    `);

    return result.recordset;
  }

  static async getSubmissionById(id: string): Promise<SpeakingSubmission | null> {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("Id", id)
      .query(`
        SELECT 
          Id as id, UserId as userId, TestId as testId, PromptId as promptId,
          PartNumber as partNumber, AudioUrl as audioUrl, DurationSeconds as durationSeconds,
          TranscribedText as transcribedText, TranscriptionConfidence as transcriptionConfidence,
          AiFeedback as aiFeedback, AiScore as aiScore,
          ScoreFluency as scoreFluency, ScoreLexical as scoreLexical,
          ScoreGrammar as scoreGrammar, ScorePronunciation as scorePronunciation,
          TeacherFeedback as teacherFeedback, TeacherScore as teacherScore,
          GradedByUserId as gradedByUserId, GradedAt as gradedAt,
          Status as status, SubmittedAt as submittedAt, UpdatedAt as updatedAt
        FROM dbo.VtepSpeakingSubmissions
        WHERE Id = @Id
      `);

    return result.recordset[0] || null;
  }

  static async updateSubmission(
    id: string,
    input: Partial<{
      audioUrl: string | null;
      durationSeconds: number | null;
      transcribedText: string | null;
      transcriptionConfidence: number | null;
      aiFeedback: any;
      aiScore: number | null;
      scoreFluency: number | null;
      scoreLexical: number | null;
      scoreGrammar: number | null;
      scorePronunciation: number | null;
      teacherFeedback: string | null;
      teacherScore: number | null;
      gradedByUserId: string | null;
      status: string;
    }>
  ): Promise<void> {
    const pool = await getPool();
    const now = new Date();
    const request = pool.request().input("Id", id).input("UpdatedAt", now);

    const setClauses: string[] = ["UpdatedAt = @UpdatedAt"];

    if (input.audioUrl !== undefined) {
      setClauses.push("AudioUrl = @AudioUrl");
      request.input("AudioUrl", input.audioUrl);
    }
    if (input.durationSeconds !== undefined) {
      setClauses.push("DurationSeconds = @DurationSeconds");
      request.input("DurationSeconds", input.durationSeconds);
    }
    if (input.transcribedText !== undefined) {
      setClauses.push("TranscribedText = @TranscribedText");
      request.input("TranscribedText", input.transcribedText);
    }
    if (input.transcriptionConfidence !== undefined) {
      setClauses.push("TranscriptionConfidence = @TranscriptionConfidence");
      request.input("TranscriptionConfidence", input.transcriptionConfidence);
    }
    if (input.aiFeedback !== undefined) {
      setClauses.push("AiFeedback = @AiFeedback");
      request.input("AiFeedback", JSON.stringify(input.aiFeedback));
    }
    if (input.aiScore !== undefined) {
      setClauses.push("AiScore = @AiScore");
      request.input("AiScore", input.aiScore);
    }
    if (input.scoreFluency !== undefined) {
      setClauses.push("ScoreFluency = @ScoreFluency");
      request.input("ScoreFluency", input.scoreFluency);
    }
    if (input.scoreLexical !== undefined) {
      setClauses.push("ScoreLexical = @ScoreLexical");
      request.input("ScoreLexical", input.scoreLexical);
    }
    if (input.scoreGrammar !== undefined) {
      setClauses.push("ScoreGrammar = @ScoreGrammar");
      request.input("ScoreGrammar", input.scoreGrammar);
    }
    if (input.scorePronunciation !== undefined) {
      setClauses.push("ScorePronunciation = @ScorePronunciation");
      request.input("ScorePronunciation", input.scorePronunciation);
    }
    if (input.teacherFeedback !== undefined) {
      setClauses.push("TeacherFeedback = @TeacherFeedback");
      request.input("TeacherFeedback", input.teacherFeedback);
    }
    if (input.teacherScore !== undefined) {
      setClauses.push("TeacherScore = @TeacherScore");
      request.input("TeacherScore", input.teacherScore);
    }
    if (input.gradedByUserId !== undefined) {
      setClauses.push("GradedByUserId = @GradedByUserId");
      setClauses.push("GradedAt = @GradedAt");
      request.input("GradedByUserId", input.gradedByUserId);
      request.input("GradedAt", now);
    }
    if (input.status !== undefined) {
      setClauses.push("Status = @Status");
      request.input("Status", input.status);
    }

    if (setClauses.length > 1) {
      await request.query(`
        UPDATE dbo.VtepSpeakingSubmissions
        SET ${setClauses.join(", ")}
        WHERE Id = @Id
      `);
    }
  }

  static async deleteSubmission(id: string): Promise<void> {
    const pool = await getPool();
    await pool.request().input("Id", id).query(`
      DELETE FROM dbo.VtepSpeakingSubmissions WHERE Id = @Id
    `);
  }

  // ==================== RANDOM TEST GENERATION ====================
  
  static async createRandomTest(input: {
    level?: string | null;
    title?: string;
    documentId?: string | null;
    createdByUserId?: string | null;
  }): Promise<{ id: string; selectedPrompts: any }> {
    const pool = await getPool();
    
    // Get random Part 1 prompts (2 topics, each with 3 questions)
    const part1Result = await pool
      .request()
      .input("Level", input.level || "b1")
      .query(`
        SELECT TOP 2 Id
        FROM dbo.VtepSpeakingPrompts
        WHERE PartNumber = 1 AND (Level = @Level OR Level IS NULL)
        ORDER BY NEWID()
      `);
    
    const part1Ids = part1Result.recordset.map((r: any) => r.Id);
    
    // Get random Part 2 prompt (1 situation with 3 solutions)
    const part2Result = await pool
      .request()
      .input("Level", input.level || "b2")
      .query(`
        SELECT TOP 1 Id
        FROM dbo.VtepSpeakingPrompts
        WHERE PartNumber = 2 AND (Level = @Level OR Level IS NULL)
        ORDER BY NEWID()
      `);
    
    const part2Id = part2Result.recordset[0]?.Id || null;
    
    // Get random Part 3 prompt (1 topic with bullets and follow-up questions)
    const part3Result = await pool
      .request()
      .input("Level", input.level || "b2")
      .query(`
        SELECT TOP 1 Id
        FROM dbo.VtepSpeakingPrompts
        WHERE PartNumber = 3 AND (Level = @Level OR Level IS NULL)
        ORDER BY NEWID()
      `);
    
    const part3Ids = part3Result.recordset.map((r: any) => r.Id);
    
    // Create the test
    const testId = await this.createTest({
      title: input.title || `Random Speaking Test - ${input.level || "B1"}`,
      description: "Randomly generated speaking test",
      level: input.level,
      part1PromptIds: part1Ids,
      part2PromptId: part2Id,
      part3PromptIds: part3Ids,
      totalTimeMinutes: 12,
      isActive: true,
      isPublic: true,
      documentId: input.documentId,
      createdByUserId: input.createdByUserId,
    });
    
    return {
      id: testId.id,
      selectedPrompts: {
        part1: part1Ids,
        part2: part2Id,
        part3: part3Ids,
      },
    };
  }
}
