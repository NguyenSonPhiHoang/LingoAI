-- Create Grammar lessons + exercises + attempts
-- Public content shared for all users; attempts are per-user.

IF OBJECT_ID('dbo.GrammarLessons', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.GrammarLessons (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_GrammarLessons PRIMARY KEY,
    Title NVARCHAR(200) NOT NULL,
    Level NVARCHAR(10) NOT NULL,
    Topic NVARCHAR(100) NULL,
    ContentMarkdown NVARCHAR(MAX) NOT NULL,
    IsPublished BIT NOT NULL CONSTRAINT DF_GrammarLessons_IsPublished DEFAULT(1),
    CreatedByUserId NVARCHAR(128) NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_GrammarLessons_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_GrammarLessons_UpdatedAt DEFAULT SYSUTCDATETIME()
  );

  CREATE INDEX IX_GrammarLessons_Level ON dbo.GrammarLessons(Level);
  CREATE INDEX IX_GrammarLessons_IsPublished ON dbo.GrammarLessons(IsPublished);
END
GO

IF OBJECT_ID('dbo.GrammarExercises', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.GrammarExercises (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_GrammarExercises PRIMARY KEY,
    LessonId UNIQUEIDENTIFIER NOT NULL,
    Type NVARCHAR(30) NOT NULL, -- mcq | text
    Prompt NVARCHAR(MAX) NOT NULL,
    OptionsJson NVARCHAR(MAX) NULL, -- for mcq: [{"id":"a","label":"..."}, ...]
    AnswerJson NVARCHAR(MAX) NOT NULL, -- for mcq: {"correctOptionId":"a"}; for text: {"accepted":["..."]}
    Explanation NVARCHAR(MAX) NULL,
    Points INT NOT NULL CONSTRAINT DF_GrammarExercises_Points DEFAULT(1),
    SortOrder INT NOT NULL CONSTRAINT DF_GrammarExercises_SortOrder DEFAULT(0),
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_GrammarExercises_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_GrammarExercises_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_GrammarExercises_LessonId FOREIGN KEY (LessonId) REFERENCES dbo.GrammarLessons(Id) ON DELETE CASCADE
  );

  CREATE INDEX IX_GrammarExercises_LessonId ON dbo.GrammarExercises(LessonId);
END
GO

IF OBJECT_ID('dbo.GrammarAttempts', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.GrammarAttempts (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_GrammarAttempts PRIMARY KEY,
    UserId NVARCHAR(128) NOT NULL,
    LessonId UNIQUEIDENTIFIER NOT NULL,
    SubmittedAt DATETIME2 NOT NULL CONSTRAINT DF_GrammarAttempts_SubmittedAt DEFAULT SYSUTCDATETIME(),
    Score INT NOT NULL,
    MaxScore INT NOT NULL,
    CONSTRAINT FK_GrammarAttempts_LessonId FOREIGN KEY (LessonId) REFERENCES dbo.GrammarLessons(Id) ON DELETE CASCADE
  );

  CREATE INDEX IX_GrammarAttempts_UserId ON dbo.GrammarAttempts(UserId);
  CREATE INDEX IX_GrammarAttempts_LessonId ON dbo.GrammarAttempts(LessonId);
END
GO

IF OBJECT_ID('dbo.GrammarAttemptAnswers', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.GrammarAttemptAnswers (
    AttemptId UNIQUEIDENTIFIER NOT NULL,
    ExerciseId UNIQUEIDENTIFIER NOT NULL,
    UserAnswerJson NVARCHAR(MAX) NULL,
    IsCorrect BIT NOT NULL,
    Score INT NOT NULL,
    Points INT NOT NULL,
    CONSTRAINT PK_GrammarAttemptAnswers PRIMARY KEY (AttemptId, ExerciseId),
    CONSTRAINT FK_GrammarAttemptAnswers_AttemptId FOREIGN KEY (AttemptId) REFERENCES dbo.GrammarAttempts(Id) ON DELETE CASCADE,
    CONSTRAINT FK_GrammarAttemptAnswers_ExerciseId FOREIGN KEY (ExerciseId) REFERENCES dbo.GrammarExercises(Id) ON DELETE NO ACTION
  );

  CREATE INDEX IX_GrammarAttemptAnswers_AttemptId ON dbo.GrammarAttemptAnswers(AttemptId);
END
GO
