-- Add dbo.TestItems: item-level assessment results for scalable personalization
-- This keeps dbo.Tests as the attempt header and stores per-question/per-item outcomes here.

IF NOT EXISTS (
  SELECT 1
  FROM sys.objects
  WHERE object_id = OBJECT_ID(N'[dbo].[TestItems]') AND type IN (N'U')
)
BEGIN
  CREATE TABLE dbo.TestItems
  (
    Id NVARCHAR(100) NOT NULL PRIMARY KEY,
    TestId NVARCHAR(100) NOT NULL,
    UserId NVARCHAR(100) NULL,

    -- Classification
    Type NVARCHAR(100) NULL,         -- mirrors Tests.Type (placement/review/lesson/practice)
    Skill NVARCHAR(50) NULL,         -- reading/listening/speaking/writing/pronunciation
    Kind NVARCHAR(100) NULL,         -- e.g. reading-question, pos-question, intonation-choice

    -- Item identity (helps dedupe & longitudinal tracking)
    ItemKey NVARCHAR(200) NULL,      -- stable key per item within an attempt (e.g. q-0, scenario-1)

    -- Outcome
    IsCorrect BIT NULL,
    Score FLOAT NULL,

    -- Extensible details
    Data NVARCHAR(MAX) NULL,         -- JSON payload (selectedAnswer, correctAnswer, prompt, etc.)

    CreatedAt DATETIMEOFFSET NULL
  );

  -- Helpful indexes
  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'IX_TestItems_TestId' AND object_id = OBJECT_ID('dbo.TestItems')
  )
  BEGIN
    CREATE INDEX IX_TestItems_TestId ON dbo.TestItems(TestId) INCLUDE (UserId, Type, Skill, Kind, ItemKey, IsCorrect, Score, CreatedAt);
  END

  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'IX_TestItems_User_Skill_CreatedAt' AND object_id = OBJECT_ID('dbo.TestItems')
  )
  BEGIN
    CREATE INDEX IX_TestItems_User_Skill_CreatedAt ON dbo.TestItems(UserId, Skill, CreatedAt) INCLUDE (Type, Kind, IsCorrect, Score, TestId);
  END

  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'IX_TestItems_User_Kind_CreatedAt' AND object_id = OBJECT_ID('dbo.TestItems')
  )
  BEGIN
    CREATE INDEX IX_TestItems_User_Kind_CreatedAt ON dbo.TestItems(UserId, Kind, CreatedAt) INCLUDE (Type, Skill, IsCorrect, Score, TestId);
  END
END
