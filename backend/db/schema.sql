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
    CreatedAt DATETIMEOFFSET NULL
  );
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
    AudioUrl NVARCHAR(2000) NULL,
    CreatedAt DATETIMEOFFSET NULL
  );
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
    AudioUrl NVARCHAR(2000) NULL
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
    CreatedAt DATETIMEOFFSET NULL
  );
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

