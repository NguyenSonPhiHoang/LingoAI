-- Basic schema for migration (T-SQL style checks)

IF NOT EXISTS (SELECT *
FROM sys.objects
WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type in (N'U'))
BEGIN
  CREATE TABLE dbo.Users
  (
    Id NVARCHAR(100) PRIMARY KEY,
    Email NVARCHAR(256) NULL,
    DisplayName NVARCHAR(256) NULL,
    PasswordHash NVARCHAR(200) NULL,
    RoleId NVARCHAR(100) NULL,
    Status NVARCHAR(50) NULL CONSTRAINT DF_Users_Status DEFAULT 'pending',
    OmniChatEnabled BIT NULL CONSTRAINT DF_Users_OmniChatEnabled DEFAULT 1,
    CreatedAt DATETIMEOFFSET NULL
  );
END

-- System learning resources (admin-managed)
IF NOT EXISTS (
  SELECT *
  FROM sys.objects
  WHERE object_id = OBJECT_ID(N'[dbo].[LearningResources]') AND type in (N'U')
)
BEGIN
  CREATE TABLE dbo.LearningResources
  (
    Id NVARCHAR(100) PRIMARY KEY,
    Level NVARCHAR(10) NOT NULL,
    Skill NVARCHAR(50) NOT NULL,
    Label NVARCHAR(500) NOT NULL,
    Url NVARCHAR(2048) NOT NULL,
    CreatedByUserId NVARCHAR(100) NULL,
    CreatedAt DATETIMEOFFSET NULL,
    UpdatedAt DATETIMEOFFSET NULL
  );

  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_LearningResources_Level_Skill_CreatedAt' AND object_id = OBJECT_ID('dbo.LearningResources')
  )
  BEGIN
    CREATE INDEX IX_LearningResources_Level_Skill_CreatedAt
      ON dbo.LearningResources(Level, Skill, CreatedAt)
      INCLUDE (Label, Url);
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UX_LearningResources_Level_Skill_Url' AND object_id = OBJECT_ID('dbo.LearningResources')
  )
  BEGIN
    CREATE UNIQUE INDEX UX_LearningResources_Level_Skill_Url
      ON dbo.LearningResources(Level, Skill, Url);
  END

  IF EXISTS (
    SELECT *
    FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type in (N'U')
  )
  BEGIN
    IF NOT EXISTS (
      SELECT *
      FROM sys.foreign_keys
      WHERE name = 'FK_LearningResources_Users'
    )
    BEGIN
      ALTER TABLE dbo.LearningResources
        ADD CONSTRAINT FK_LearningResources_Users
        FOREIGN KEY (CreatedByUserId) REFERENCES dbo.Users(Id);
    END
  END
END

IF NOT EXISTS (
  SELECT *
  FROM sys.objects
  WHERE object_id = OBJECT_ID(N'[dbo].[LearningResourceRatings]') AND type in (N'U')
)
BEGIN
  CREATE TABLE dbo.LearningResourceRatings
  (
    ResourceId NVARCHAR(100) NOT NULL,
    UserId NVARCHAR(100) NOT NULL,
    Rating INT NOT NULL,
    CreatedAt DATETIMEOFFSET NULL,
    UpdatedAt DATETIMEOFFSET NULL,
    CONSTRAINT PK_LearningResourceRatings PRIMARY KEY (ResourceId, UserId)
  );

  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_LearningResourceRatings_Resource' AND object_id = OBJECT_ID('dbo.LearningResourceRatings')
  )
  BEGIN
    CREATE INDEX IX_LearningResourceRatings_Resource
      ON dbo.LearningResourceRatings(ResourceId)
      INCLUDE (Rating, UpdatedAt);
  END

  IF EXISTS (
    SELECT *
    FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[LearningResources]') AND type in (N'U')
  )
  BEGIN
    IF NOT EXISTS (
      SELECT *
      FROM sys.foreign_keys
      WHERE name = 'FK_LearningResourceRatings_Resources'
    )
    BEGIN
      ALTER TABLE dbo.LearningResourceRatings
        ADD CONSTRAINT FK_LearningResourceRatings_Resources
        FOREIGN KEY (ResourceId) REFERENCES dbo.LearningResources(Id);
    END
  END

  IF EXISTS (
    SELECT *
    FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type in (N'U')
  )
  BEGIN
    IF NOT EXISTS (
      SELECT *
      FROM sys.foreign_keys
      WHERE name = 'FK_LearningResourceRatings_Users'
    )
    BEGIN
      ALTER TABLE dbo.LearningResourceRatings
        ADD CONSTRAINT FK_LearningResourceRatings_Users
        FOREIGN KEY (UserId) REFERENCES dbo.Users(Id);
    END
  END
END

-- Add Status column to Users if missing
IF EXISTS (SELECT *
FROM sys.objects
WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type in (N'U'))
BEGIN
  IF NOT EXISTS (SELECT *
  FROM sys.columns
  WHERE Name = N'Status' AND Object_ID = Object_ID(N'[dbo].[Users]'))
  BEGIN
    ALTER TABLE dbo.Users ADD Status NVARCHAR(50) NULL CONSTRAINT DF_Users_Status DEFAULT 'pending';
    UPDATE dbo.Users SET Status = 'pending' WHERE Status IS NULL;
  END

  IF NOT EXISTS (SELECT *
  FROM sys.columns
  WHERE Name = N'OmniChatEnabled' AND Object_ID = Object_ID(N'[dbo].[Users]'))
  BEGIN
    ALTER TABLE dbo.Users ADD OmniChatEnabled BIT NULL CONSTRAINT DF_Users_OmniChatEnabled DEFAULT 1;
    UPDATE dbo.Users SET OmniChatEnabled = 1 WHERE OmniChatEnabled IS NULL;
  END
END

-- Lessons table
IF NOT EXISTS (SELECT *
FROM sys.objects
WHERE object_id = OBJECT_ID(N'[dbo].[Lessons]') AND type in (N'U'))
BEGIN
  CREATE TABLE dbo.Lessons
  (
    Id NVARCHAR(100) PRIMARY KEY,
    Title NVARCHAR(500) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    Content NVARCHAR(MAX) NULL,
    Level NVARCHAR(50) NULL,
    Language NVARCHAR(50) NULL,
    AuthorId NVARCHAR(100) NULL,
    IsPublished BIT DEFAULT 0,
    CreatedAt DATETIMEOFFSET NULL,
    UpdatedAt DATETIMEOFFSET NULL
  );
END

-- Vocabulary table
IF NOT EXISTS (SELECT *
FROM sys.objects
WHERE object_id = OBJECT_ID(N'[dbo].[Vocabulary]') AND type in (N'U'))
BEGIN
  CREATE TABLE dbo.Vocabulary
  (
    Id NVARCHAR(100) PRIMARY KEY,
    Word NVARCHAR(200) NOT NULL,
    Lemma NVARCHAR(200) NULL,
    Definition NVARCHAR(MAX) NULL,
    Example NVARCHAR(MAX) NULL,
    PartOfSpeech NVARCHAR(100) NULL,
    Pronunciation NVARCHAR(200) NULL,
    AudioUrl NVARCHAR(MAX) NULL,
    CreatedAt DATETIMEOFFSET NULL
  );
END

-- Upgrade: allow large audio payloads (data:audio/...;base64,...) in SQL
IF EXISTS (SELECT *
FROM sys.objects
WHERE object_id = OBJECT_ID(N'[dbo].[Vocabulary]') AND type in (N'U'))
BEGIN
  IF EXISTS (
    SELECT 1
  FROM sys.columns
  WHERE Object_ID = Object_ID(N'[dbo].[Vocabulary]') AND Name = N'AudioUrl' AND max_length <> -1
  )
  BEGIN
    ALTER TABLE dbo.Vocabulary ALTER COLUMN AudioUrl NVARCHAR(MAX) NULL;
  END
END

-- Global Words table (normalized term, shared across users)
IF NOT EXISTS (SELECT *
FROM sys.objects
WHERE object_id = OBJECT_ID(N'[dbo].[Words]') AND type in (N'U'))
BEGIN
  CREATE TABLE dbo.Words
  (
    Id NVARCHAR(100) PRIMARY KEY,
    Term NVARCHAR(200) NOT NULL,
    TermNormalized NVARCHAR(200) NOT NULL,
    Pronunciation NVARCHAR(200) NULL,
    AudioUrl NVARCHAR(MAX) NULL,
    CreatedAt DATETIMEOFFSET NULL
  );

  IF NOT EXISTS (
    SELECT 1
  FROM sys.indexes
  WHERE name = 'UX_Words_TermNormalized' AND object_id = OBJECT_ID('dbo.Words')
  )
  BEGIN
    CREATE UNIQUE INDEX UX_Words_TermNormalized ON dbo.Words(TermNormalized);
  END
END

-- Upgrade: allow large audio payloads in Words.AudioUrl
IF EXISTS (SELECT *
FROM sys.objects
WHERE object_id = OBJECT_ID(N'[dbo].[Words]') AND type in (N'U'))
BEGIN
  IF EXISTS (
    SELECT 1
  FROM sys.columns
  WHERE Object_ID = Object_ID(N'[dbo].[Words]') AND Name = N'AudioUrl' AND max_length <> -1
  )
  BEGIN
    ALTER TABLE dbo.Words ALTER COLUMN AudioUrl NVARCHAR(MAX) NULL;
  END
END

-- Per-user vocabulary details + metadata (joins to Words)
IF NOT EXISTS (SELECT *
FROM sys.objects
WHERE object_id = OBJECT_ID(N'[dbo].[UserVocabulary]') AND type in (N'U'))
BEGIN
  CREATE TABLE dbo.UserVocabulary
  (
    Id NVARCHAR(100) PRIMARY KEY,
    UserId NVARCHAR(100) NOT NULL,
    WordId NVARCHAR(100) NOT NULL,

    PartOfSpeech NVARCHAR(100) NULL,
    Definition NVARCHAR(MAX) NULL,
    VietnameseDefinition NVARCHAR(MAX) NULL,
    Sentence NVARCHAR(MAX) NULL,
    VietnameseSentence NVARCHAR(MAX) NULL,
    SentenceAudioUrl NVARCHAR(MAX) NULL,
    LearnCount INT NOT NULL CONSTRAINT DF_UserVocabulary_LearnCount DEFAULT 0,
    Synonyms NVARCHAR(MAX) NULL,
    Antonyms NVARCHAR(MAX) NULL,
    IrregularForms NVARCHAR(MAX) NULL,
    WordForms NVARCHAR(MAX) NULL,

    Favorite BIT NULL CONSTRAINT DF_UserVocabulary_Favorite DEFAULT 0,
    Topic NVARCHAR(200) NULL,
    CreatedAt DATETIMEOFFSET NULL,
    UpdatedAt DATETIMEOFFSET NULL
  );

  IF NOT EXISTS (
    SELECT 1
  FROM sys.indexes
  WHERE name = 'UX_UserVocabulary_User_Word' AND object_id = OBJECT_ID('dbo.UserVocabulary')
  )
  BEGIN
    CREATE UNIQUE INDEX UX_UserVocabulary_User_Word ON dbo.UserVocabulary(UserId, WordId);
  END

  IF EXISTS (SELECT *
  FROM sys.objects
  WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type in (N'U'))
  BEGIN
    IF NOT EXISTS (
      SELECT *
    FROM sys.foreign_keys
    WHERE name = 'FK_UserVocabulary_Users'
    )
    BEGIN
      ALTER TABLE dbo.UserVocabulary ADD CONSTRAINT FK_UserVocabulary_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(Id);
    END
  END

  IF EXISTS (SELECT *
  FROM sys.objects
  WHERE object_id = OBJECT_ID(N'[dbo].[Words]') AND type in (N'U'))
  BEGIN
    IF NOT EXISTS (
      SELECT *
    FROM sys.foreign_keys
    WHERE name = 'FK_UserVocabulary_Words'
    )
    BEGIN
      ALTER TABLE dbo.UserVocabulary ADD CONSTRAINT FK_UserVocabulary_Words FOREIGN KEY (WordId) REFERENCES dbo.Words(Id);
    END
  END
END

-- Upgrade: add WordForms if missing
IF EXISTS (SELECT *
FROM sys.objects
WHERE object_id = OBJECT_ID(N'[dbo].[UserVocabulary]') AND type in (N'U'))
BEGIN
  IF NOT EXISTS (
    SELECT *
  FROM sys.columns
  WHERE Name = N'WordForms' AND Object_ID = Object_ID(N'[dbo].[UserVocabulary]')
  )
  BEGIN
    ALTER TABLE dbo.UserVocabulary
      ADD WordForms NVARCHAR(MAX) NULL;
  END
END

-- Upgrade: add LearnCount if missing
IF EXISTS (SELECT *
FROM sys.objects
WHERE object_id = OBJECT_ID(N'[dbo].[UserVocabulary]') AND type in (N'U'))
BEGIN
  IF NOT EXISTS (
    SELECT *
  FROM sys.columns
  WHERE Name = N'LearnCount' AND Object_ID = Object_ID(N'[dbo].[UserVocabulary]')
  )
  BEGIN
    ALTER TABLE dbo.UserVocabulary
      ADD LearnCount INT NOT NULL CONSTRAINT DF_UserVocabulary_LearnCount DEFAULT 0;
  END
END

-- Upgrade: allow large audio payloads in UserVocabulary.SentenceAudioUrl
IF EXISTS (SELECT *
FROM sys.objects
WHERE object_id = OBJECT_ID(N'[dbo].[UserVocabulary]') AND type in (N'U'))
BEGIN
  IF EXISTS (
    SELECT 1
  FROM sys.columns
  WHERE Object_ID = Object_ID(N'[dbo].[UserVocabulary]') AND Name = N'SentenceAudioUrl' AND max_length <> -1
  )
  BEGIN
    ALTER TABLE dbo.UserVocabulary ALTER COLUMN SentenceAudioUrl NVARCHAR(MAX) NULL;
  END
END

-- Junction table: Lesson <-> Vocabulary
IF NOT EXISTS (SELECT *
FROM sys.objects
WHERE object_id = OBJECT_ID(N'[dbo].[LessonVocabulary]') AND type in (N'U'))
BEGIN
  CREATE TABLE dbo.LessonVocabulary
  (
    LessonId NVARCHAR(100) NOT NULL,
    VocabId NVARCHAR(100) NOT NULL,
    PRIMARY KEY (LessonId, VocabId)
  );
END

-- Roles table and seed
IF NOT EXISTS (SELECT *
FROM sys.objects
WHERE object_id = OBJECT_ID(N'[dbo].[Roles]') AND type in (N'U'))
BEGIN
  CREATE TABLE dbo.Roles
  (
    Id NVARCHAR(100) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL UNIQUE,
    Description NVARCHAR(500) NULL,
    CreatedAt DATETIMEOFFSET NULL
  );
END

-- Seed common roles if not present
IF NOT EXISTS (SELECT 1
FROM Roles
WHERE Name = 'Admin')
  INSERT INTO Roles
  (Id, Name, Description, CreatedAt)
VALUES
  ('role_admin', 'Admin', 'Administrator', SYSDATETIMEOFFSET());
IF NOT EXISTS (SELECT 1
FROM Roles
WHERE Name = 'Teacher')
  INSERT INTO Roles
  (Id, Name, Description, CreatedAt)
VALUES
  ('role_teacher', 'Teacher', 'Teacher users', SYSDATETIMEOFFSET());
IF NOT EXISTS (SELECT 1
FROM Roles
WHERE Name = 'Student')
  INSERT INTO Roles
  (Id, Name, Description, CreatedAt)
VALUES
  ('role_student', 'Student', 'Student users', SYSDATETIMEOFFSET());

-- Add foreign key from Users.RoleId -> Roles.Id if not exists
IF EXISTS (SELECT *
FROM sys.objects
WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type in (N'U'))
BEGIN
  IF NOT EXISTS (SELECT *
  FROM sys.foreign_keys
  WHERE parent_object_id = OBJECT_ID(N'[dbo].[Users]') AND referenced_object_id = OBJECT_ID(N'[dbo].[Roles]'))
  BEGIN
    ALTER TABLE dbo.Users ADD CONSTRAINT FK_Users_Roles FOREIGN KEY (RoleId) REFERENCES dbo.Roles(Id);
  END
END

-- Storybooks and pages
IF NOT EXISTS (SELECT *
FROM sys.objects
WHERE object_id = OBJECT_ID(N'[dbo].[Storybooks]') AND type in (N'U'))
BEGIN
  CREATE TABLE dbo.Storybooks
  (
    Id NVARCHAR(100) PRIMARY KEY,
    Title NVARCHAR(500) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    Language NVARCHAR(50) NULL,
    AuthorId NVARCHAR(100) NULL,
    -- AI storybook fields (used by Next.js storybook feature)
    Level NVARCHAR(50) NULL,
    Format NVARCHAR(50) NULL,
    Status NVARCHAR(50) NULL,
    KeyVocabulary NVARCHAR(MAX) NULL,
    EnglishStory NVARCHAR(MAX) NULL,
    VietnameseStory NVARCHAR(MAX) NULL,
    InterspersedStory NVARCHAR(MAX) NULL,
    FullEnglishStory NVARCHAR(MAX) NULL,
    TitleAudioUrl NVARCHAR(MAX) NULL,
    EnglishContentAudioUrl NVARCHAR(MAX) NULL,
    VietnameseContentAudioUrl NVARCHAR(MAX) NULL,
    IsPublished BIT DEFAULT 0,
    CreatedAt DATETIMEOFFSET NULL,
    UpdatedAt DATETIMEOFFSET NULL
  );
END

IF NOT EXISTS (SELECT *
FROM sys.objects
WHERE object_id = OBJECT_ID(N'[dbo].[StorybookPages]') AND type in (N'U'))
BEGIN
  CREATE TABLE dbo.StorybookPages
  (
    Id NVARCHAR(100) PRIMARY KEY,
    StorybookId NVARCHAR(100) NOT NULL,
    PageNumber INT NOT NULL,
    Content NVARCHAR(MAX) NULL,
    AudioUrl NVARCHAR(MAX) NULL
  );
END

-- Junction: Storybook <-> Lesson (if storybooks include lessons)
IF NOT EXISTS (SELECT *
FROM sys.objects
WHERE object_id = OBJECT_ID(N'[dbo].[StorybookLessons]') AND type in (N'U'))
BEGIN
  CREATE TABLE dbo.StorybookLessons
  (
    StorybookId NVARCHAR(100) NOT NULL,
    LessonId NVARCHAR(100) NOT NULL,
    PRIMARY KEY (StorybookId, LessonId)
  );
END

-- Tests / Results (generic)
IF NOT EXISTS (SELECT *
FROM sys.objects
WHERE object_id = OBJECT_ID(N'[dbo].[Tests]') AND type in (N'U'))
BEGIN
  CREATE TABLE dbo.Tests
  (
    Id NVARCHAR(100) PRIMARY KEY,
    UserId NVARCHAR(100) NULL,
    Type NVARCHAR(100) NULL,
    Data NVARCHAR(MAX) NULL,
    -- store JSON if needed
    Score FLOAT NULL,
    CreatedAt DATETIMEOFFSET NULL,

    -- Structured fields for scalable personalization queries
    ContextType NVARCHAR(50) NULL,
    ContextId NVARCHAR(100) NULL,
    Skill NVARCHAR(50) NULL,
    TotalQuestions INT NULL,
    CorrectAnswers INT NULL,
    DurationSeconds INT NULL,
    ClientCreatedAt DATETIMEOFFSET NULL,
    CompletedAt DATETIMEOFFSET NULL,
    Version INT NULL CONSTRAINT DF_Tests_Version DEFAULT 1
  );

  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_Tests_User_Type_CompletedAt' AND object_id = OBJECT_ID('dbo.Tests')
  )
  BEGIN
    CREATE INDEX IX_Tests_User_Type_CompletedAt
      ON dbo.Tests(UserId, Type, CompletedAt)
      INCLUDE (Score, CorrectAnswers, TotalQuestions, Skill, ContextType, ContextId, CreatedAt);
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_Tests_User_Context' AND object_id = OBJECT_ID('dbo.Tests')
  )
  BEGIN
    CREATE INDEX IX_Tests_User_Context
      ON dbo.Tests(UserId, ContextType, ContextId)
      INCLUDE (Type, Skill, Score, CompletedAt, CreatedAt);
  END
END

-- TestItems: per-question/per-item outcomes (for personalization)
IF NOT EXISTS (SELECT *
FROM sys.objects
WHERE object_id = OBJECT_ID(N'[dbo].[TestItems]') AND type in (N'U'))
BEGIN
  CREATE TABLE dbo.TestItems
  (
    Id NVARCHAR(100) NOT NULL PRIMARY KEY,
    TestId NVARCHAR(100) NOT NULL,
    UserId NVARCHAR(100) NULL,
    Type NVARCHAR(100) NULL,
    Skill NVARCHAR(50) NULL,
    Kind NVARCHAR(100) NULL,
    ItemKey NVARCHAR(200) NULL,
    IsCorrect BIT NULL,
    Score FLOAT NULL,
    Data NVARCHAR(MAX) NULL,
    CreatedAt DATETIMEOFFSET NULL
  );

  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_TestItems_TestId' AND object_id = OBJECT_ID('dbo.TestItems')
  )
  BEGIN
    CREATE INDEX IX_TestItems_TestId ON dbo.TestItems(TestId)
      INCLUDE (UserId, Type, Skill, Kind, ItemKey, IsCorrect, Score, CreatedAt);
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_TestItems_User_Skill_CreatedAt' AND object_id = OBJECT_ID('dbo.TestItems')
  )
  BEGIN
    CREATE INDEX IX_TestItems_User_Skill_CreatedAt ON dbo.TestItems(UserId, Skill, CreatedAt)
      INCLUDE (Type, Kind, IsCorrect, Score, TestId);
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_TestItems_User_Kind_CreatedAt' AND object_id = OBJECT_ID('dbo.TestItems')
  )
  BEGIN
    CREATE INDEX IX_TestItems_User_Kind_CreatedAt ON dbo.TestItems(UserId, Kind, CreatedAt)
      INCLUDE (Type, Skill, IsCorrect, Score, TestId);
  END
END

-- User progress on lessons
IF NOT EXISTS (SELECT *
FROM sys.objects
WHERE object_id = OBJECT_ID(N'[dbo].[UserLessons]') AND type in (N'U'))
BEGIN
  CREATE TABLE dbo.UserLessons
  (
    UserId NVARCHAR(100) NOT NULL,
    LessonId NVARCHAR(100) NOT NULL,
    Status NVARCHAR(50) NULL,
    Progress FLOAT NULL,
    LastSeen DATETIMEOFFSET NULL,
    PRIMARY KEY (UserId, LessonId)
  );
END

-- User settings per user (store JSON as NVARCHAR(MAX))
IF NOT EXISTS (SELECT *
FROM sys.objects
WHERE object_id = OBJECT_ID(N'[dbo].[UserSettings]') AND type in (N'U'))
BEGIN
  CREATE TABLE dbo.UserSettings
  (
    UserId NVARCHAR(100) PRIMARY KEY,
    Settings NVARCHAR(MAX) NULL,
    GeminiApiKey NVARCHAR(512) NULL,
    UpdatedAt DATETIMEOFFSET NULL
  );
END

-- Library documents per user (store reading/listening materials)
IF NOT EXISTS (
  SELECT *
  FROM sys.objects
  WHERE object_id = OBJECT_ID(N'[dbo].[LibraryDocuments]') AND type in (N'U')
)
BEGIN
  CREATE TABLE dbo.LibraryDocuments
  (
    Id NVARCHAR(100) PRIMARY KEY,
    UserId NVARCHAR(100) NOT NULL,
    Skill NVARCHAR(50) NOT NULL,
    Title NVARCHAR(500) NOT NULL,
    Url NVARCHAR(2048) NULL,
    Summary NVARCHAR(MAX) NULL,
    ContentText NVARCHAR(MAX) NULL,
    SourceType NVARCHAR(50) NULL,
    CreatedAt DATETIMEOFFSET NULL,
    UpdatedAt DATETIMEOFFSET NULL
  );

  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_LibraryDocuments_User_CreatedAt' AND object_id = OBJECT_ID('dbo.LibraryDocuments')
  )
  BEGIN
    CREATE INDEX IX_LibraryDocuments_User_CreatedAt
      ON dbo.LibraryDocuments(UserId, CreatedAt)
      INCLUDE (Skill, Title, Url, UpdatedAt);
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_LibraryDocuments_User_Skill_CreatedAt' AND object_id = OBJECT_ID('dbo.LibraryDocuments')
  )
  BEGIN
    CREATE INDEX IX_LibraryDocuments_User_Skill_CreatedAt
      ON dbo.LibraryDocuments(UserId, Skill, CreatedAt)
      INCLUDE (Title, Url, UpdatedAt);
  END

  -- Optional dedupe by (UserId, Url) when Url exists
  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UX_LibraryDocuments_User_Url' AND object_id = OBJECT_ID('dbo.LibraryDocuments')
  )
  BEGIN
    CREATE UNIQUE INDEX UX_LibraryDocuments_User_Url
      ON dbo.LibraryDocuments(UserId, Url)
      WHERE Url IS NOT NULL;
  END

  -- Optional FK to Users
  IF EXISTS (SELECT *
    FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type in (N'U'))
  BEGIN
    IF NOT EXISTS (
      SELECT *
      FROM sys.foreign_keys
      WHERE name = 'FK_LibraryDocuments_Users'
    )
    BEGIN
      ALTER TABLE dbo.LibraryDocuments
        ADD CONSTRAINT FK_LibraryDocuments_Users
        FOREIGN KEY (UserId) REFERENCES dbo.Users(Id);
    END
  END
END

-- Library contents per user (notes/attachments linked to LibraryDocuments)
IF NOT EXISTS (
  SELECT *
  FROM sys.objects
  WHERE object_id = OBJECT_ID(N'[dbo].[LibraryContents]') AND type in (N'U')
)
BEGIN
  CREATE TABLE dbo.LibraryContents
  (
    Id NVARCHAR(100) PRIMARY KEY,
    DocId NVARCHAR(100) NOT NULL,
    UserId NVARCHAR(100) NOT NULL,
    FileName NVARCHAR(500) NOT NULL,
    Type NVARCHAR(20) NOT NULL,
    Content NVARCHAR(MAX) NOT NULL,
    IsNotePage BIT NOT NULL CONSTRAINT DF_LibraryContents_IsNotePage DEFAULT (0),
    CreatedAt DATETIMEOFFSET NULL,
    UpdatedAt DATETIMEOFFSET NULL
  );

  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_LibraryContents_Doc_CreatedAt' AND object_id = OBJECT_ID('dbo.LibraryContents')
  )
  BEGIN
    CREATE INDEX IX_LibraryContents_Doc_CreatedAt
      ON dbo.LibraryContents(DocId, CreatedAt)
      INCLUDE (UserId, FileName, Type, UpdatedAt);
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_LibraryContents_User_Doc_CreatedAt' AND object_id = OBJECT_ID('dbo.LibraryContents')
  )
  BEGIN
    CREATE INDEX IX_LibraryContents_User_Doc_CreatedAt
      ON dbo.LibraryContents(UserId, DocId, CreatedAt)
      INCLUDE (FileName, Type, UpdatedAt);
  END

  -- Optional FK to Users
  IF EXISTS (
    SELECT *
    FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type in (N'U')
  )
  BEGIN
    IF NOT EXISTS (
      SELECT *
      FROM sys.foreign_keys
      WHERE name = 'FK_LibraryContents_Users'
    )
    BEGIN
      ALTER TABLE dbo.LibraryContents
        ADD CONSTRAINT FK_LibraryContents_Users
        FOREIGN KEY (UserId) REFERENCES dbo.Users(Id);
    END
  END

  -- Optional FK to LibraryDocuments
  IF EXISTS (
    SELECT *
    FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[LibraryDocuments]') AND type in (N'U')
  )
  BEGIN
    IF NOT EXISTS (
      SELECT *
      FROM sys.foreign_keys
      WHERE name = 'FK_LibraryContents_Documents'
    )
    BEGIN
      ALTER TABLE dbo.LibraryContents
        ADD CONSTRAINT FK_LibraryContents_Documents
        FOREIGN KEY (DocId) REFERENCES dbo.LibraryDocuments(Id);
    END
  END
END

-- Upgrade: add IsNotePage to LibraryContents if missing
IF EXISTS (
  SELECT *
  FROM sys.objects
  WHERE object_id = OBJECT_ID(N'[dbo].[LibraryContents]') AND type in (N'U')
)
BEGIN
  IF NOT EXISTS (
    SELECT *
    FROM sys.columns
    WHERE Name = N'IsNotePage' AND Object_ID = Object_ID(N'[dbo].[LibraryContents]')
  )
  BEGIN
    ALTER TABLE dbo.LibraryContents
      ADD IsNotePage BIT NOT NULL CONSTRAINT DF_LibraryContents_IsNotePage DEFAULT (0);
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UX_LibraryContents_User_Doc_NotePage' AND object_id = OBJECT_ID('dbo.LibraryContents')
  )
  BEGIN
    CREATE UNIQUE INDEX UX_LibraryContents_User_Doc_NotePage
      ON dbo.LibraryContents(UserId, DocId)
      WHERE IsNotePage = 1;
  END
END

-- User projects per user
IF NOT EXISTS (SELECT *
FROM sys.objects
WHERE object_id = OBJECT_ID(N'[dbo].[UserProjects]') AND type in (N'U'))
BEGIN
  CREATE TABLE dbo.UserProjects
  (
    Id NVARCHAR(100) PRIMARY KEY,
    UserId NVARCHAR(100) NOT NULL,
    Name NVARCHAR(256) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    Data NVARCHAR(MAX) NULL,
    CreatedAt DATETIMEOFFSET NULL,
    UpdatedAt DATETIMEOFFSET NULL
  );

  -- Optional FK to Users
  IF EXISTS (SELECT *
  FROM sys.objects
  WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type in (N'U'))
  BEGIN
    IF NOT EXISTS (
      SELECT *
    FROM sys.foreign_keys
    WHERE parent_object_id = OBJECT_ID(N'[dbo].[UserProjects]') AND referenced_object_id = OBJECT_ID(N'[dbo].[Users]')
    )
    BEGIN
      ALTER TABLE dbo.UserProjects ADD CONSTRAINT FK_UserProjects_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(Id);
    END
  END
END

-- User profiles (extended info separate from core Users table)
IF NOT EXISTS (SELECT *
FROM sys.objects
WHERE object_id = OBJECT_ID(N'[dbo].[UserProfiles]') AND type in (N'U'))
BEGIN
  CREATE TABLE dbo.UserProfiles
  (
    UserId NVARCHAR(100) PRIMARY KEY,
    DisplayName NVARCHAR(256) NULL,
    PhotoUrl NVARCHAR(2000) NULL,
    Bio NVARCHAR(MAX) NULL,
    Status NVARCHAR(50) NULL,
    CreatedAt DATETIMEOFFSET NULL,
    UpdatedAt DATETIMEOFFSET NULL
  );

  IF EXISTS (SELECT *
  FROM sys.objects
  WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type in (N'U'))
  BEGIN
    IF NOT EXISTS (
      SELECT *
    FROM sys.foreign_keys
    WHERE parent_object_id = OBJECT_ID(N'[dbo].[UserProfiles]') AND referenced_object_id = OBJECT_ID(N'[dbo].[Users]')
    )
    BEGIN
      ALTER TABLE dbo.UserProfiles ADD CONSTRAINT FK_UserProfiles_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(Id);
    END
  END
END

-- Add additional tables (storybooks assets, tags, categories) as required by your app

-- ==============================================================
-- Grammar lessons + exercises + attempts (system-wide public)
-- ==============================================================

IF NOT EXISTS (
  SELECT *
  FROM sys.objects
  WHERE object_id = OBJECT_ID(N'[dbo].[GrammarLessons]') AND type in (N'U')
)
BEGIN
  CREATE TABLE dbo.GrammarLessons
  (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_GrammarLessons PRIMARY KEY,
    Title NVARCHAR(200) NOT NULL,
    Level NVARCHAR(10) NOT NULL,
    Topic NVARCHAR(100) NULL,
    ContentMarkdown NVARCHAR(MAX) NOT NULL,
    IsPublished BIT NOT NULL CONSTRAINT DF_GrammarLessons_IsPublished DEFAULT 1,
    CreatedByUserId NVARCHAR(100) NULL,
    CreatedAt DATETIMEOFFSET NULL,
    UpdatedAt DATETIMEOFFSET NULL
  );

  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_GrammarLessons_Level' AND object_id = OBJECT_ID('dbo.GrammarLessons')
  )
  BEGIN
    CREATE INDEX IX_GrammarLessons_Level ON dbo.GrammarLessons(Level);
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_GrammarLessons_IsPublished' AND object_id = OBJECT_ID('dbo.GrammarLessons')
  )
  BEGIN
    CREATE INDEX IX_GrammarLessons_IsPublished ON dbo.GrammarLessons(IsPublished);
  END

  IF EXISTS (
    SELECT *
    FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type in (N'U')
  )
  BEGIN
    IF NOT EXISTS (
      SELECT *
      FROM sys.foreign_keys
      WHERE name = 'FK_GrammarLessons_Users'
    )
    BEGIN
      ALTER TABLE dbo.GrammarLessons
        ADD CONSTRAINT FK_GrammarLessons_Users
        FOREIGN KEY (CreatedByUserId) REFERENCES dbo.Users(Id);
    END
  END
END

IF NOT EXISTS (
  SELECT *
  FROM sys.objects
  WHERE object_id = OBJECT_ID(N'[dbo].[GrammarExercises]') AND type in (N'U')
)
BEGIN
  CREATE TABLE dbo.GrammarExercises
  (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_GrammarExercises PRIMARY KEY,
    LessonId UNIQUEIDENTIFIER NOT NULL,
    Type NVARCHAR(30) NOT NULL,
    Prompt NVARCHAR(MAX) NOT NULL,
    OptionsJson NVARCHAR(MAX) NULL,
    AnswerJson NVARCHAR(MAX) NOT NULL,
    Explanation NVARCHAR(MAX) NULL,
    Points INT NOT NULL CONSTRAINT DF_GrammarExercises_Points DEFAULT 1,
    SortOrder INT NOT NULL CONSTRAINT DF_GrammarExercises_SortOrder DEFAULT 0,
    CreatedAt DATETIMEOFFSET NULL,
    UpdatedAt DATETIMEOFFSET NULL,
    CONSTRAINT FK_GrammarExercises_LessonId FOREIGN KEY (LessonId) REFERENCES dbo.GrammarLessons(Id) ON DELETE CASCADE
  );

  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_GrammarExercises_LessonId' AND object_id = OBJECT_ID('dbo.GrammarExercises')
  )
  BEGIN
    CREATE INDEX IX_GrammarExercises_LessonId ON dbo.GrammarExercises(LessonId);
  END
END

IF NOT EXISTS (
  SELECT *
  FROM sys.objects
  WHERE object_id = OBJECT_ID(N'[dbo].[GrammarAttempts]') AND type in (N'U')
)
BEGIN
  CREATE TABLE dbo.GrammarAttempts
  (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_GrammarAttempts PRIMARY KEY,
    UserId NVARCHAR(100) NOT NULL,
    LessonId UNIQUEIDENTIFIER NOT NULL,
    SubmittedAt DATETIMEOFFSET NULL,
    Score INT NOT NULL,
    MaxScore INT NOT NULL,
    CONSTRAINT FK_GrammarAttempts_LessonId FOREIGN KEY (LessonId) REFERENCES dbo.GrammarLessons(Id) ON DELETE CASCADE
  );

  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_GrammarAttempts_UserId' AND object_id = OBJECT_ID('dbo.GrammarAttempts')
  )
  BEGIN
    CREATE INDEX IX_GrammarAttempts_UserId ON dbo.GrammarAttempts(UserId);
  END

  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_GrammarAttempts_LessonId' AND object_id = OBJECT_ID('dbo.GrammarAttempts')
  )
  BEGIN
    CREATE INDEX IX_GrammarAttempts_LessonId ON dbo.GrammarAttempts(LessonId);
  END
END

IF NOT EXISTS (
  SELECT *
  FROM sys.objects
  WHERE object_id = OBJECT_ID(N'[dbo].[GrammarAttemptAnswers]') AND type in (N'U')
)
BEGIN
  CREATE TABLE dbo.GrammarAttemptAnswers
  (
    AttemptId UNIQUEIDENTIFIER NOT NULL,
    ExerciseId UNIQUEIDENTIFIER NOT NULL,
    UserAnswerJson NVARCHAR(MAX) NULL,
    IsCorrect BIT NOT NULL,
    Score INT NOT NULL,
    Points INT NOT NULL,
    CONSTRAINT PK_GrammarAttemptAnswers PRIMARY KEY (AttemptId, ExerciseId),
    CONSTRAINT FK_GrammarAttemptAnswers_AttemptId FOREIGN KEY (AttemptId) REFERENCES dbo.GrammarAttempts(Id) ON DELETE CASCADE,
    CONSTRAINT FK_GrammarAttemptAnswers_ExerciseId FOREIGN KEY (ExerciseId) REFERENCES dbo.GrammarExercises(Id)
  );

  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_GrammarAttemptAnswers_AttemptId' AND object_id = OBJECT_ID('dbo.GrammarAttemptAnswers')
  )
  BEGIN
    CREATE INDEX IX_GrammarAttemptAnswers_AttemptId ON dbo.GrammarAttemptAnswers(AttemptId);
  END
END

