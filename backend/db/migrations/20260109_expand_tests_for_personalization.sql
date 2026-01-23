-- Expand dbo.Tests to support scalable personalization queries
-- Adds structured columns for fast filtering/aggregation while keeping Data JSON for extensibility.

IF EXISTS (
  SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Tests]') AND type IN (N'U')
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'ContextType' AND Object_ID = Object_ID(N'[dbo].[Tests]'))
    ALTER TABLE dbo.Tests ADD ContextType NVARCHAR(50) NULL;

  IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'ContextId' AND Object_ID = Object_ID(N'[dbo].[Tests]'))
    ALTER TABLE dbo.Tests ADD ContextId NVARCHAR(100) NULL;

  IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'Skill' AND Object_ID = Object_ID(N'[dbo].[Tests]'))
    ALTER TABLE dbo.Tests ADD Skill NVARCHAR(50) NULL;

  IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'TotalQuestions' AND Object_ID = Object_ID(N'[dbo].[Tests]'))
    ALTER TABLE dbo.Tests ADD TotalQuestions INT NULL;

  IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'CorrectAnswers' AND Object_ID = Object_ID(N'[dbo].[Tests]'))
    ALTER TABLE dbo.Tests ADD CorrectAnswers INT NULL;

  IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'DurationSeconds' AND Object_ID = Object_ID(N'[dbo].[Tests]'))
    ALTER TABLE dbo.Tests ADD DurationSeconds INT NULL;

  IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'ClientCreatedAt' AND Object_ID = Object_ID(N'[dbo].[Tests]'))
    ALTER TABLE dbo.Tests ADD ClientCreatedAt DATETIMEOFFSET NULL;

  IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'CompletedAt' AND Object_ID = Object_ID(N'[dbo].[Tests]'))
    ALTER TABLE dbo.Tests ADD CompletedAt DATETIMEOFFSET NULL;

  IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE Name = N'Version' AND Object_ID = Object_ID(N'[dbo].[Tests]'))
    ALTER TABLE dbo.Tests ADD Version INT NULL CONSTRAINT DF_Tests_Version DEFAULT 1;

  -- Helpful indexes for personalization queries
  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'IX_Tests_User_Type_CompletedAt' AND object_id = OBJECT_ID('dbo.Tests')
  )
  BEGIN
    CREATE INDEX IX_Tests_User_Type_CompletedAt
      ON dbo.Tests(UserId, Type, CompletedAt)
      INCLUDE (Score, CorrectAnswers, TotalQuestions, Skill, ContextType, ContextId, CreatedAt);
  END

  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'IX_Tests_User_Context' AND object_id = OBJECT_ID('dbo.Tests')
  )
  BEGIN
    CREATE INDEX IX_Tests_User_Context
      ON dbo.Tests(UserId, ContextType, ContextId)
      INCLUDE (Type, Skill, Score, CompletedAt, CreatedAt);
  END
END
