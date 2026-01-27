-- Normalize Tests/TestItems date storage to UTC+7 (Vietnam)
-- NOTE: SQL Server DATETIME has no time zone; to reliably store +7, use DATETIMEOFFSET.
-- This migration keeps existing DATETIMEOFFSET columns and forces stored values to +07:00.

-- sp_Tests_Insert
IF OBJECT_ID('sp_Tests_Insert', 'P') IS NOT NULL DROP PROCEDURE sp_Tests_Insert;
GO
CREATE PROCEDURE sp_Tests_Insert
  @Id NVARCHAR(100),
  @UserId NVARCHAR(100),
  @Type NVARCHAR(100),
  @Data NVARCHAR(MAX),
  @Score FLOAT,
  @CreatedAt DATETIMEOFFSET = NULL,
  @ContextType NVARCHAR(50) = NULL,
  @ContextId NVARCHAR(100) = NULL,
  @Skill NVARCHAR(50) = NULL,
  @TotalQuestions INT = NULL,
  @CorrectAnswers INT = NULL,
  @DurationSeconds INT = NULL,
  @ClientCreatedAt DATETIMEOFFSET = NULL,
  @CompletedAt DATETIMEOFFSET = NULL,
  @Version INT = NULL
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @NowLocal DATETIMEOFFSET = (SYSDATETIMEOFFSET() AT TIME ZONE 'SE Asia Standard Time');
  DECLARE @CreatedAtLocal DATETIMEOFFSET =
    CASE WHEN @CreatedAt IS NULL THEN @NowLocal ELSE SWITCHOFFSET(@CreatedAt, '+07:00') END;
  DECLARE @ClientCreatedAtLocal DATETIMEOFFSET =
    CASE WHEN @ClientCreatedAt IS NULL THEN NULL ELSE SWITCHOFFSET(@ClientCreatedAt, '+07:00') END;
  DECLARE @CompletedAtLocal DATETIMEOFFSET =
    CASE WHEN @CompletedAt IS NULL THEN NULL ELSE SWITCHOFFSET(@CompletedAt, '+07:00') END;

  INSERT INTO Tests
    (Id, UserId, Type, Data, Score, CreatedAt, ContextType, ContextId, Skill, TotalQuestions, CorrectAnswers, DurationSeconds, ClientCreatedAt, CompletedAt, Version)
  VALUES
    (@Id, @UserId, @Type, @Data, @Score, @CreatedAtLocal, @ContextType, @ContextId, @Skill, @TotalQuestions, @CorrectAnswers, @DurationSeconds, @ClientCreatedAtLocal, @CompletedAtLocal, ISNULL(@Version, 1));
END
GO

-- sp_Tests_Update
IF OBJECT_ID('sp_Tests_Update', 'P') IS NOT NULL DROP PROCEDURE sp_Tests_Update;
GO
CREATE PROCEDURE sp_Tests_Update
  @Id NVARCHAR(100),
  @Data NVARCHAR(MAX),
  @Score FLOAT,
  @ContextType NVARCHAR(50) = NULL,
  @ContextId NVARCHAR(100) = NULL,
  @Skill NVARCHAR(50) = NULL,
  @TotalQuestions INT = NULL,
  @CorrectAnswers INT = NULL,
  @DurationSeconds INT = NULL,
  @ClientCreatedAt DATETIMEOFFSET = NULL,
  @CompletedAt DATETIMEOFFSET = NULL,
  @Version INT = NULL
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @ClientCreatedAtLocal DATETIMEOFFSET =
    CASE WHEN @ClientCreatedAt IS NULL THEN NULL ELSE SWITCHOFFSET(@ClientCreatedAt, '+07:00') END;
  DECLARE @CompletedAtLocal DATETIMEOFFSET =
    CASE WHEN @CompletedAt IS NULL THEN NULL ELSE SWITCHOFFSET(@CompletedAt, '+07:00') END;

  UPDATE Tests
  SET
    Data = @Data,
    Score = @Score,
    ContextType = COALESCE(@ContextType, ContextType),
    ContextId = COALESCE(@ContextId, ContextId),
    Skill = COALESCE(@Skill, Skill),
    TotalQuestions = COALESCE(@TotalQuestions, TotalQuestions),
    CorrectAnswers = COALESCE(@CorrectAnswers, CorrectAnswers),
    DurationSeconds = COALESCE(@DurationSeconds, DurationSeconds),
    ClientCreatedAt = COALESCE(@ClientCreatedAtLocal, ClientCreatedAt),
    CompletedAt = COALESCE(@CompletedAtLocal, CompletedAt),
    Version = COALESCE(@Version, Version)
  WHERE Id = @Id;
END
GO

-- sp_TestItems_Insert
IF OBJECT_ID('sp_TestItems_Insert', 'P') IS NOT NULL DROP PROCEDURE sp_TestItems_Insert;
GO
CREATE PROCEDURE sp_TestItems_Insert
  @Id NVARCHAR(100),
  @TestId NVARCHAR(100),
  @UserId NVARCHAR(100) = NULL,
  @Type NVARCHAR(100) = NULL,
  @Skill NVARCHAR(50) = NULL,
  @Kind NVARCHAR(100) = NULL,
  @ItemKey NVARCHAR(200) = NULL,
  @IsCorrect BIT = NULL,
  @Score FLOAT = NULL,
  @Data NVARCHAR(MAX) = NULL,
  @CreatedAt DATETIMEOFFSET = NULL
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @NowLocal DATETIMEOFFSET = (SYSDATETIMEOFFSET() AT TIME ZONE 'SE Asia Standard Time');
  DECLARE @CreatedAtLocal DATETIMEOFFSET =
    CASE WHEN @CreatedAt IS NULL THEN @NowLocal ELSE SWITCHOFFSET(@CreatedAt, '+07:00') END;

  INSERT INTO TestItems
    (Id, TestId, UserId, Type, Skill, Kind, ItemKey, IsCorrect, Score, Data, CreatedAt)
  VALUES
    (@Id, @TestId, @UserId, @Type, @Skill, @Kind, @ItemKey, @IsCorrect, @Score, @Data, @CreatedAtLocal);
END
GO
