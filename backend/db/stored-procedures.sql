-- =============================================
-- STORED PROCEDURES FOR LINGOAI
-- Naming convention: sp_[TableName]_[Action]
-- USERS

-- sp_Users_Insert
IF OBJECT_ID('sp_Users_Insert', 'P') IS NOT NULL DROP PROCEDURE sp_Users_Insert;
GO
CREATE or alter PROCEDURE sp_Users_Insert
  @Id NVARCHAR(100),
  @Email NVARCHAR(256),
  @DisplayName NVARCHAR(256),
  @PasswordHash NVARCHAR(200),
  @RoleId NVARCHAR(100),
  @Status NVARCHAR(50),
  @CreatedAt DATETIMEOFFSET
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO Users
    (Id, Email, DisplayName, PasswordHash, RoleId, Status, CreatedAt)
  VALUES
    (@Id, @Email, @DisplayName, @PasswordHash, @RoleId, ISNULL(@Status, 'pending'), @CreatedAt);
END
-- =============================================
-- USER SETTINGS
-- =============================================

-- sp_UserSettings_Get
IF OBJECT_ID('sp_UserSettings_Get', 'P') IS NOT NULL DROP PROCEDURE sp_UserSettings_Get;
GO
CREATE or alter PROCEDURE sp_UserSettings_Get
  @UserId NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT TOP 1
    UserId, Settings, GeminiApiKey, UpdatedAt
  FROM UserSettings
  WHERE UserId = @UserId;
END
GO

-- sp_UserSettings_Upsert
IF OBJECT_ID('sp_UserSettings_Upsert', 'P') IS NOT NULL DROP PROCEDURE sp_UserSettings_Upsert;
GO
CREATE or alter PROCEDURE sp_UserSettings_Upsert
  @UserId NVARCHAR(100),
  @Settings NVARCHAR(MAX),
  @GeminiApiKey NVARCHAR(512),
  @UpdatedAt DATETIMEOFFSET
AS
BEGIN
  SET NOCOUNT ON;
  MERGE INTO UserSettings WITH (HOLDLOCK) AS target
  USING (SELECT @UserId AS UserId) AS source
  ON (target.UserId = source.UserId)
  WHEN MATCHED THEN
    UPDATE SET Settings = @Settings, GeminiApiKey = @GeminiApiKey, UpdatedAt = @UpdatedAt
  WHEN NOT MATCHED THEN
    INSERT (UserId, Settings, GeminiApiKey, UpdatedAt) VALUES (@UserId, @Settings, @GeminiApiKey, @UpdatedAt);
END
GO

-- =============================================
-- USER PROJECTS
-- =============================================

-- Insert
IF OBJECT_ID('sp_UserProjects_Insert', 'P') IS NOT NULL DROP PROCEDURE sp_UserProjects_Insert;
GO
CREATE or alter PROCEDURE sp_UserProjects_Insert
  @Id NVARCHAR(100),
  @UserId NVARCHAR(100),
  @Name NVARCHAR(256),
  @Description NVARCHAR(MAX),
  @Data NVARCHAR(MAX),
  @CreatedAt DATETIMEOFFSET,
  @UpdatedAt DATETIMEOFFSET
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO UserProjects
    (Id, UserId, Name, Description, Data, CreatedAt, UpdatedAt)
  VALUES
    (@Id, @UserId, @Name, @Description, @Data, @CreatedAt, @UpdatedAt);
END
GO

-- Update
IF OBJECT_ID('sp_UserProjects_Update', 'P') IS NOT NULL DROP PROCEDURE sp_UserProjects_Update;
GO
CREATE or alter PROCEDURE sp_UserProjects_Update
  @Id NVARCHAR(100),
  @UserId NVARCHAR(100),
  @Name NVARCHAR(256),
  @Description NVARCHAR(MAX),
  @Data NVARCHAR(MAX),
  @UpdatedAt DATETIMEOFFSET
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE UserProjects
  SET Name = @Name,
      Description = @Description,
      Data = @Data,
      UpdatedAt = @UpdatedAt
  WHERE Id = @Id AND UserId = @UserId;
END
GO

-- Delete
IF OBJECT_ID('sp_UserProjects_Delete', 'P') IS NOT NULL DROP PROCEDURE sp_UserProjects_Delete;
GO
CREATE or alter PROCEDURE sp_UserProjects_Delete
  @Id NVARCHAR(100),
  @UserId NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM UserProjects WHERE Id = @Id AND UserId = @UserId;
END
GO

-- Get by Id
IF OBJECT_ID('sp_UserProjects_GetById', 'P') IS NOT NULL DROP PROCEDURE sp_UserProjects_GetById;
GO
CREATE or alter PROCEDURE sp_UserProjects_GetById
  @Id NVARCHAR(100),
  @UserId NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT TOP 1
    *
  FROM UserProjects
  WHERE Id = @Id AND UserId = @UserId;
END
GO

-- List by user
IF OBJECT_ID('sp_UserProjects_ListByUser', 'P') IS NOT NULL DROP PROCEDURE sp_UserProjects_ListByUser;
GO
CREATE or alter PROCEDURE sp_UserProjects_ListByUser
  @UserId NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM UserProjects
  WHERE UserId = @UserId
  ORDER BY CreatedAt DESC;
END
GO

GO
CREATE or alter  PROCEDURE sp_Users_Update
  @Id NVARCHAR(100),
  @Email NVARCHAR(256),
  @DisplayName NVARCHAR(256),
  @PasswordHash NVARCHAR(200),
  @RoleId NVARCHAR(100),
  @Status NVARCHAR(50)
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE Users
  SET Email = @Email,
      DisplayName = @DisplayName,
      PasswordHash = ISNULL(@PasswordHash, PasswordHash),
      RoleId = @RoleId,
      Status = ISNULL(@Status, Status)
  WHERE Id = @Id;
END
GO

-- sp_Users_Upsert
IF OBJECT_ID('sp_Users_Upsert', 'P') IS NOT NULL DROP PROCEDURE sp_Users_Upsert;
GO
CREATE or alter  PROCEDURE sp_Users_Upsert
  @Id NVARCHAR(100),
  @Email NVARCHAR(256),
  @DisplayName NVARCHAR(256),
  @Status NVARCHAR(50),
  @CreatedAt DATETIMEOFFSET
AS
BEGIN
  SET NOCOUNT ON;
  MERGE INTO Users WITH (HOLDLOCK) AS target
  USING (SELECT @Id AS Id) AS source
  ON (target.Id = source.Id)
  WHEN MATCHED THEN
    UPDATE SET Email = @Email, DisplayName = @DisplayName, Status = ISNULL(@Status, Status), CreatedAt = @CreatedAt
  WHEN NOT MATCHED THEN
    INSERT (Id, Email, DisplayName, Status, CreatedAt) VALUES (@Id, @Email, @DisplayName, ISNULL(@Status, 'pending'), @CreatedAt);
END
GO

-- sp_Users_Delete
IF OBJECT_ID('sp_Users_Delete', 'P') IS NOT NULL DROP PROCEDURE sp_Users_Delete;
GO
CREATE or alter PROCEDURE sp_Users_Delete
  @Id NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM Users WHERE Id = @Id;
END
GO

-- sp_Users_GetById
IF OBJECT_ID('sp_Users_GetById', 'P') IS NOT NULL DROP PROCEDURE sp_Users_GetById;
GO
CREATE or alter PROCEDURE sp_Users_GetById
  @Id NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT TOP 1
    *
  FROM Users
  WHERE Id = @Id;
END
GO

-- sp_Users_GetByEmail
IF OBJECT_ID('sp_Users_GetByEmail', 'P') IS NOT NULL DROP PROCEDURE sp_Users_GetByEmail;
GO
CREATE or alter PROCEDURE sp_Users_GetByEmail
  @Email NVARCHAR(256)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT TOP 1
    *
  FROM Users
  WHERE Email = @Email;
END
GO

-- sp_Users_GetAll
IF OBJECT_ID('sp_Users_GetAll', 'P') IS NOT NULL DROP PROCEDURE sp_Users_GetAll;
GO
CREATE or alter PROCEDURE sp_Users_GetAll
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM Users;
END
GO

-- sp_Users_VerifyCredentials
IF OBJECT_ID('sp_Users_VerifyCredentials', 'P') IS NOT NULL DROP PROCEDURE sp_Users_VerifyCredentials;
GO
CREATE or alter PROCEDURE sp_Users_VerifyCredentials
  @EmailOrId NVARCHAR(256)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT TOP 1
    Id, PasswordHash
  FROM Users
  WHERE Id = @EmailOrId OR Email = @EmailOrId;
END
GO

-- sp_Users_AssignRole
IF OBJECT_ID('sp_Users_AssignRole', 'P') IS NOT NULL DROP PROCEDURE sp_Users_AssignRole;
GO
CREATE or alter PROCEDURE sp_Users_AssignRole
  @UserId NVARCHAR(100),
  @RoleId NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE Users SET RoleId = @RoleId WHERE Id = @UserId;
END
GO

-- =============================================
-- ROLES
-- =============================================

-- sp_Roles_Insert
IF OBJECT_ID('sp_Roles_Insert', 'P') IS NOT NULL DROP PROCEDURE sp_Roles_Insert;
GO
CREATE or alter PROCEDURE sp_Roles_Insert
  @Id NVARCHAR(100),
  @Name NVARCHAR(100),
  @Description NVARCHAR(500),
  @CreatedAt DATETIMEOFFSET
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO Roles
    (Id, Name, Description, CreatedAt)
  VALUES
    (@Id, @Name, @Description, @CreatedAt);
END
GO

-- sp_Roles_Update
IF OBJECT_ID('sp_Roles_Update', 'P') IS NOT NULL DROP PROCEDURE sp_Roles_Update;
GO
CREATE or alter PROCEDURE sp_Roles_Update
  @Id NVARCHAR(100),
  @Name NVARCHAR(100),
  @Description NVARCHAR(500)
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE Roles SET Name = @Name, Description = @Description WHERE Id = @Id;
END
GO

-- sp_Roles_Delete
IF OBJECT_ID('sp_Roles_Delete', 'P') IS NOT NULL DROP PROCEDURE sp_Roles_Delete;
GO
CREATE or alter PROCEDURE sp_Roles_Delete
  @Id NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM Roles WHERE Id = @Id;
END
GO

-- sp_Roles_GetById
IF OBJECT_ID('sp_Roles_GetById', 'P') IS NOT NULL DROP PROCEDURE sp_Roles_GetById;
GO
CREATE or alter PROCEDURE sp_Roles_GetById
  @Id NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT TOP 1
    *
  FROM Roles
  WHERE Id = @Id;
END
GO

-- sp_Roles_GetByName
IF OBJECT_ID('sp_Roles_GetByName', 'P') IS NOT NULL DROP PROCEDURE sp_Roles_GetByName;
GO
CREATE or alter PROCEDURE sp_Roles_GetByName
  @Name NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT TOP 1
    *
  FROM Roles
  WHERE Name = @Name;
END
GO

-- sp_Roles_GetAll
IF OBJECT_ID('sp_Roles_GetAll', 'P') IS NOT NULL DROP PROCEDURE sp_Roles_GetAll;
GO
CREATE or alter PROCEDURE sp_Roles_GetAll
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM Roles;
END
GO

-- =============================================
-- LESSONS
-- =============================================

-- sp_Lessons_Insert
IF OBJECT_ID('sp_Lessons_Insert', 'P') IS NOT NULL DROP PROCEDURE sp_Lessons_Insert;
GO
CREATE or alter PROCEDURE sp_Lessons_Insert
  @Id NVARCHAR(100),
  @Title NVARCHAR(500),
  @Description NVARCHAR(MAX),
  @Content NVARCHAR(MAX),
  @Level NVARCHAR(50),
  @Language NVARCHAR(50),
  @AuthorId NVARCHAR(100),
  @IsPublished BIT,
  @CreatedAt DATETIMEOFFSET,
  @UpdatedAt DATETIMEOFFSET
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO Lessons
    (Id, Title, Description, Content, Level, Language, AuthorId, IsPublished, CreatedAt, UpdatedAt)
  VALUES
    (@Id, @Title, @Description, @Content, @Level, @Language, @AuthorId, @IsPublished, @CreatedAt, @UpdatedAt);
END
GO

-- sp_Lessons_Update
IF OBJECT_ID('sp_Lessons_Update', 'P') IS NOT NULL DROP PROCEDURE sp_Lessons_Update;
GO
CREATE or alter PROCEDURE sp_Lessons_Update
  @Id NVARCHAR(100),
  @Title NVARCHAR(500),
  @Description NVARCHAR(MAX),
  @Content NVARCHAR(MAX),
  @Level NVARCHAR(50),
  @Language NVARCHAR(50),
  @IsPublished BIT,
  @UpdatedAt DATETIMEOFFSET
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE Lessons
  SET Title = @Title, Description = @Description, Content = @Content,
      Level = @Level, Language = @Language, IsPublished = @IsPublished, UpdatedAt = @UpdatedAt
  WHERE Id = @Id;
END
GO

-- sp_Lessons_Delete
IF OBJECT_ID('sp_Lessons_Delete', 'P') IS NOT NULL DROP PROCEDURE sp_Lessons_Delete;
GO
CREATE or alter PROCEDURE sp_Lessons_Delete
  @Id NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM LessonVocabulary WHERE LessonId = @Id;
  DELETE FROM Lessons WHERE Id = @Id;
END
GO

-- sp_Lessons_GetById
IF OBJECT_ID('sp_Lessons_GetById', 'P') IS NOT NULL DROP PROCEDURE sp_Lessons_GetById;
GO
CREATE or alter PROCEDURE sp_Lessons_GetById
  @Id NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT TOP 1
    *
  FROM Lessons
  WHERE Id = @Id;
END
GO

-- sp_Lessons_GetAll
IF OBJECT_ID('sp_Lessons_GetAll', 'P') IS NOT NULL DROP PROCEDURE sp_Lessons_GetAll;
GO
CREATE or alter PROCEDURE sp_Lessons_GetAll
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM Lessons;
END
GO

-- sp_Lessons_GetByAuthor
IF OBJECT_ID('sp_Lessons_GetByAuthor', 'P') IS NOT NULL DROP PROCEDURE sp_Lessons_GetByAuthor;
GO
CREATE or alter PROCEDURE sp_Lessons_GetByAuthor
  @AuthorId NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM Lessons
  WHERE AuthorId = @AuthorId;
END
GO

-- =============================================
-- VOCABULARY
-- =============================================

-- sp_Vocabulary_Insert
IF OBJECT_ID('sp_Vocabulary_Insert', 'P') IS NOT NULL DROP PROCEDURE sp_Vocabulary_Insert;
GO
CREATE or alter PROCEDURE sp_Vocabulary_Insert
  @Id NVARCHAR(100),
  @Word NVARCHAR(200),
  @Lemma NVARCHAR(200),
  @Definition NVARCHAR(MAX),
  @Example NVARCHAR(MAX),
  @PartOfSpeech NVARCHAR(100),
  @Pronunciation NVARCHAR(200),
  @AudioUrl NVARCHAR(2000),
  @CreatedAt DATETIMEOFFSET
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO Vocabulary
    (Id, Word, Lemma, Definition, Example, PartOfSpeech, Pronunciation, AudioUrl, CreatedAt)
  VALUES
    (@Id, @Word, @Lemma, @Definition, @Example, @PartOfSpeech, @Pronunciation, @AudioUrl, @CreatedAt);
END
GO

-- sp_Vocabulary_Update
IF OBJECT_ID('sp_Vocabulary_Update', 'P') IS NOT NULL DROP PROCEDURE sp_Vocabulary_Update;
GO
CREATE or alter PROCEDURE sp_Vocabulary_Update
  @Id NVARCHAR(100),
  @Word NVARCHAR(200),
  @Lemma NVARCHAR(200),
  @Definition NVARCHAR(MAX),
  @Example NVARCHAR(MAX),
  @PartOfSpeech NVARCHAR(100),
  @Pronunciation NVARCHAR(200),
  @AudioUrl NVARCHAR(2000)
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE Vocabulary
  SET Word = @Word, Lemma = @Lemma, Definition = @Definition, Example = @Example,
      PartOfSpeech = @PartOfSpeech, Pronunciation = @Pronunciation, AudioUrl = @AudioUrl
  WHERE Id = @Id;
END
GO

-- sp_Vocabulary_Delete
IF OBJECT_ID('sp_Vocabulary_Delete', 'P') IS NOT NULL DROP PROCEDURE sp_Vocabulary_Delete;
GO
CREATE or alter PROCEDURE sp_Vocabulary_Delete
  @Id NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM LessonVocabulary WHERE VocabId = @Id;
  DELETE FROM Vocabulary WHERE Id = @Id;
END
GO

-- sp_Vocabulary_GetById
IF OBJECT_ID('sp_Vocabulary_GetById', 'P') IS NOT NULL DROP PROCEDURE sp_Vocabulary_GetById;
GO
CREATE or alter PROCEDURE sp_Vocabulary_GetById
  @Id NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT TOP 1
    *
  FROM Vocabulary
  WHERE Id = @Id;
END
GO

-- sp_Vocabulary_GetAll
IF OBJECT_ID('sp_Vocabulary_GetAll', 'P') IS NOT NULL DROP PROCEDURE sp_Vocabulary_GetAll;
GO
CREATE or alter PROCEDURE sp_Vocabulary_GetAll
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM Vocabulary;
END
GO

-- =============================================
-- LESSON_VOCABULARY (Junction)
-- =============================================

-- sp_LessonVocabulary_Insert
IF OBJECT_ID('sp_LessonVocabulary_Insert', 'P') IS NOT NULL DROP PROCEDURE sp_LessonVocabulary_Insert;
GO
CREATE or alter PROCEDURE sp_LessonVocabulary_Insert
  @LessonId NVARCHAR(100),
  @VocabId NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  IF NOT EXISTS (SELECT 1
  FROM LessonVocabulary
  WHERE LessonId = @LessonId AND VocabId = @VocabId)
    INSERT INTO LessonVocabulary
    (LessonId, VocabId)
  VALUES
    (@LessonId, @VocabId);
END
GO

-- sp_LessonVocabulary_Delete
IF OBJECT_ID('sp_LessonVocabulary_Delete', 'P') IS NOT NULL DROP PROCEDURE sp_LessonVocabulary_Delete;
GO
CREATE or alter PROCEDURE sp_LessonVocabulary_Delete
  @LessonId NVARCHAR(100),
  @VocabId NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM LessonVocabulary WHERE LessonId = @LessonId AND VocabId = @VocabId;
END
GO

-- sp_LessonVocabulary_GetByLesson
IF OBJECT_ID('sp_LessonVocabulary_GetByLesson', 'P') IS NOT NULL DROP PROCEDURE sp_LessonVocabulary_GetByLesson;
GO
CREATE or alter PROCEDURE sp_LessonVocabulary_GetByLesson
  @LessonId NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT v.*
  FROM Vocabulary v
    INNER JOIN LessonVocabulary lv ON lv.VocabId = v.Id
  WHERE lv.LessonId = @LessonId;
END
GO

-- =============================================
-- STORYBOOKS
-- =============================================

-- sp_Storybooks_Insert
IF OBJECT_ID('sp_Storybooks_Insert', 'P') IS NOT NULL DROP PROCEDURE sp_Storybooks_Insert;
GO
CREATE or alter PROCEDURE sp_Storybooks_Insert
  @Id NVARCHAR(100),
  @Title NVARCHAR(500),
  @Description NVARCHAR(MAX),
  @Language NVARCHAR(50),
  @AuthorId NVARCHAR(100),
  @IsPublished BIT,
  @CreatedAt DATETIMEOFFSET,
  @UpdatedAt DATETIMEOFFSET
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO Storybooks
    (Id, Title, Description, Language, AuthorId, IsPublished, CreatedAt, UpdatedAt)
  VALUES
    (@Id, @Title, @Description, @Language, @AuthorId, @IsPublished, @CreatedAt, @UpdatedAt);
END
GO

-- sp_Storybooks_Update
IF OBJECT_ID('sp_Storybooks_Update', 'P') IS NOT NULL DROP PROCEDURE sp_Storybooks_Update;
GO
CREATE or alter PROCEDURE sp_Storybooks_Update
  @Id NVARCHAR(100),
  @Title NVARCHAR(500),
  @Description NVARCHAR(MAX),
  @Language NVARCHAR(50),
  @IsPublished BIT,
  @UpdatedAt DATETIMEOFFSET
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE Storybooks
  SET Title = @Title, Description = @Description, Language = @Language,
      IsPublished = @IsPublished, UpdatedAt = @UpdatedAt
  WHERE Id = @Id;
END
GO

-- sp_Storybooks_Delete
IF OBJECT_ID('sp_Storybooks_Delete', 'P') IS NOT NULL DROP PROCEDURE sp_Storybooks_Delete;
GO
CREATE or alter PROCEDURE sp_Storybooks_Delete
  @Id NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM StorybookPages WHERE StorybookId = @Id;
  DELETE FROM StorybookLessons WHERE StorybookId = @Id;
  DELETE FROM Storybooks WHERE Id = @Id;
END
GO

-- sp_Storybooks_GetById
IF OBJECT_ID('sp_Storybooks_GetById', 'P') IS NOT NULL DROP PROCEDURE sp_Storybooks_GetById;
GO
CREATE or alter PROCEDURE sp_Storybooks_GetById
  @Id NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT TOP 1
    *
  FROM Storybooks
  WHERE Id = @Id;
END
GO

-- sp_Storybooks_GetAll
IF OBJECT_ID('sp_Storybooks_GetAll', 'P') IS NOT NULL DROP PROCEDURE sp_Storybooks_GetAll;
GO
CREATE or alter PROCEDURE sp_Storybooks_GetAll
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM Storybooks;
END
GO

-- =============================================
-- STORYBOOK_PAGES
-- =============================================

-- sp_StorybookPages_Insert
IF OBJECT_ID('sp_StorybookPages_Insert', 'P') IS NOT NULL DROP PROCEDURE sp_StorybookPages_Insert;
GO
CREATE or alter PROCEDURE sp_StorybookPages_Insert
  @Id NVARCHAR(100),
  @StorybookId NVARCHAR(100),
  @PageNumber INT,
  @Content NVARCHAR(MAX),
  @AudioUrl NVARCHAR(2000)
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO StorybookPages
    (Id, StorybookId, PageNumber, Content, AudioUrl)
  VALUES
    (@Id, @StorybookId, @PageNumber, @Content, @AudioUrl);
END
GO

-- sp_StorybookPages_Update
IF OBJECT_ID('sp_StorybookPages_Update', 'P') IS NOT NULL DROP PROCEDURE sp_StorybookPages_Update;
GO
CREATE or alter PROCEDURE sp_StorybookPages_Update
  @Id NVARCHAR(100),
  @PageNumber INT,
  @Content NVARCHAR(MAX),
  @AudioUrl NVARCHAR(2000)
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE StorybookPages
  SET PageNumber = @PageNumber, Content = @Content, AudioUrl = @AudioUrl
  WHERE Id = @Id;
END
GO

-- sp_StorybookPages_Delete
IF OBJECT_ID('sp_StorybookPages_Delete', 'P') IS NOT NULL DROP PROCEDURE sp_StorybookPages_Delete;
GO
CREATE or alter PROCEDURE sp_StorybookPages_Delete
  @Id NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM StorybookPages WHERE Id = @Id;
END
GO

-- sp_StorybookPages_GetByStorybook
IF OBJECT_ID('sp_StorybookPages_GetByStorybook', 'P') IS NOT NULL DROP PROCEDURE sp_StorybookPages_GetByStorybook;
GO
CREATE or alter PROCEDURE sp_StorybookPages_GetByStorybook
  @StorybookId NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM StorybookPages
  WHERE StorybookId = @StorybookId
  ORDER BY PageNumber;
END
GO

-- =============================================
-- TESTS
-- =============================================

-- sp_Tests_Insert
IF OBJECT_ID('sp_Tests_Insert', 'P') IS NOT NULL DROP PROCEDURE sp_Tests_Insert;
GO
CREATE or alter PROCEDURE sp_Tests_Insert
  @Id NVARCHAR(100),
  @UserId NVARCHAR(100),
  @Type NVARCHAR(100),
  @Data NVARCHAR(MAX),
  @Score FLOAT,
  @CreatedAt DATETIMEOFFSET
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO Tests
    (Id, UserId, Type, Data, Score, CreatedAt)
  VALUES
    (@Id, @UserId, @Type, @Data, @Score, @CreatedAt);
END
GO

-- sp_Tests_Update
IF OBJECT_ID('sp_Tests_Update', 'P') IS NOT NULL DROP PROCEDURE sp_Tests_Update;
GO
CREATE or alter PROCEDURE sp_Tests_Update
  @Id NVARCHAR(100),
  @Data NVARCHAR(MAX),
  @Score FLOAT
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE Tests SET Data = @Data, Score = @Score WHERE Id = @Id;
END
GO

-- sp_Tests_Delete
IF OBJECT_ID('sp_Tests_Delete', 'P') IS NOT NULL DROP PROCEDURE sp_Tests_Delete;
GO
CREATE or alter PROCEDURE sp_Tests_Delete
  @Id NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM Tests WHERE Id = @Id;
END
GO

-- sp_Tests_GetById
IF OBJECT_ID('sp_Tests_GetById', 'P') IS NOT NULL DROP PROCEDURE sp_Tests_GetById;
GO
CREATE or alter PROCEDURE sp_Tests_GetById
  @Id NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT TOP 1
    *
  FROM Tests
  WHERE Id = @Id;
END
GO

-- =============================================
-- USER PROJECTS
-- =============================================

IF OBJECT_ID('sp_UserProjects_Insert', 'P') IS NOT NULL DROP PROCEDURE sp_UserProjects_Insert;
GO
CREATE or alter PROCEDURE sp_UserProjects_Insert
  @Id NVARCHAR(100),
  @UserId NVARCHAR(100),
  @Name NVARCHAR(256),
  @Description NVARCHAR(MAX),
  @Data NVARCHAR(MAX),
  @CreatedAt DATETIMEOFFSET,
  @UpdatedAt DATETIMEOFFSET
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO UserProjects
    (Id, UserId, Name, Description, Data, CreatedAt, UpdatedAt)
  VALUES
    (@Id, @UserId, @Name, @Description, @Data, @CreatedAt, @UpdatedAt);
END
GO

IF OBJECT_ID('sp_UserProjects_Update', 'P') IS NOT NULL DROP PROCEDURE sp_UserProjects_Update;
GO
CREATE or alter PROCEDURE sp_UserProjects_Update
  @Id NVARCHAR(100),
  @UserId NVARCHAR(100),
  @Name NVARCHAR(256),
  @Description NVARCHAR(MAX),
  @Data NVARCHAR(MAX),
  @UpdatedAt DATETIMEOFFSET
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE UserProjects
  SET Name = @Name,
      Description = @Description,
      Data = @Data,
      UpdatedAt = @UpdatedAt
  WHERE Id = @Id AND UserId = @UserId;
END
GO

IF OBJECT_ID('sp_UserProjects_Delete', 'P') IS NOT NULL DROP PROCEDURE sp_UserProjects_Delete;
GO
CREATE or alter PROCEDURE sp_UserProjects_Delete
  @Id NVARCHAR(100),
  @UserId NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM UserProjects WHERE Id = @Id AND UserId = @UserId;
END
GO

IF OBJECT_ID('sp_UserProjects_GetById', 'P') IS NOT NULL DROP PROCEDURE sp_UserProjects_GetById;
GO
CREATE or alter PROCEDURE sp_UserProjects_GetById
  @Id NVARCHAR(100),
  @UserId NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT TOP 1
    *
  FROM UserProjects
  WHERE Id = @Id AND UserId = @UserId;
END
GO

IF OBJECT_ID('sp_UserProjects_ListByUser', 'P') IS NOT NULL DROP PROCEDURE sp_UserProjects_ListByUser;
GO
CREATE or alter PROCEDURE sp_UserProjects_ListByUser
  @UserId NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM UserProjects
  WHERE UserId = @UserId
  ORDER BY CreatedAt DESC;
END
GO

-- =============================================
-- USER PROFILES
-- =============================================

IF OBJECT_ID('sp_UserProfiles_GetByUserId', 'P') IS NOT NULL DROP PROCEDURE sp_UserProfiles_GetByUserId;
GO
CREATE or alter PROCEDURE sp_UserProfiles_GetByUserId
  @UserId NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT TOP 1
    *
  FROM UserProfiles
  WHERE UserId = @UserId;
END
GO

IF OBJECT_ID('sp_UserProfiles_Upsert', 'P') IS NOT NULL DROP PROCEDURE sp_UserProfiles_Upsert;
GO
CREATE or alter PROCEDURE sp_UserProfiles_Upsert
  @UserId NVARCHAR(100),
  @DisplayName NVARCHAR(256),
  @PhotoUrl NVARCHAR(2000),
  @Bio NVARCHAR(MAX),
  @Status NVARCHAR(50),
  @CreatedAt DATETIMEOFFSET,
  @UpdatedAt DATETIMEOFFSET
AS
BEGIN
  SET NOCOUNT ON;
  MERGE INTO UserProfiles WITH (HOLDLOCK) AS target
  USING (SELECT @UserId AS UserId) AS source
  ON (target.UserId = source.UserId)
  WHEN MATCHED THEN
    UPDATE SET DisplayName = @DisplayName, PhotoUrl = @PhotoUrl, Bio = @Bio, Status = @Status, UpdatedAt = @UpdatedAt
  WHEN NOT MATCHED THEN
    INSERT (UserId, DisplayName, PhotoUrl, Bio, Status, CreatedAt, UpdatedAt)
    VALUES (@UserId, @DisplayName, @PhotoUrl, @Bio, @Status, @CreatedAt, @UpdatedAt);
END
GO

-- sp_Tests_GetByUser
IF OBJECT_ID('sp_Tests_GetByUser', 'P') IS NOT NULL DROP PROCEDURE sp_Tests_GetByUser;
GO
CREATE or alter PROCEDURE sp_Tests_GetByUser
  @UserId NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM Tests
  WHERE UserId = @UserId
  ORDER BY CreatedAt DESC;
END
GO

-- =============================================
-- USER_LESSONS (progress)
-- =============================================

-- sp_UserLessons_Upsert
IF OBJECT_ID('sp_UserLessons_Upsert', 'P') IS NOT NULL DROP PROCEDURE sp_UserLessons_Upsert;
GO
CREATE or alter PROCEDURE sp_UserLessons_Upsert
  @UserId NVARCHAR(100),
  @LessonId NVARCHAR(100),
  @Status NVARCHAR(50),
  @Progress FLOAT,
  @LastSeen DATETIMEOFFSET
AS
BEGIN
  SET NOCOUNT ON;
  IF NOT EXISTS (SELECT 1
  FROM UserLessons
  WHERE UserId = @UserId AND LessonId = @LessonId)
    INSERT INTO UserLessons
    (UserId, LessonId, Status, Progress, LastSeen)
  VALUES
    (@UserId, @LessonId, @Status, @Progress, @LastSeen)
  ELSE
    UPDATE UserLessons SET Status = @Status, Progress = @Progress, LastSeen = @LastSeen
    WHERE UserId = @UserId AND LessonId = @LessonId;
END
GO

-- sp_UserLessons_Delete
IF OBJECT_ID('sp_UserLessons_Delete', 'P') IS NOT NULL DROP PROCEDURE sp_UserLessons_Delete;
GO
CREATE or alter PROCEDURE sp_UserLessons_Delete
  @UserId NVARCHAR(100),
  @LessonId NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM UserLessons WHERE UserId = @UserId AND LessonId = @LessonId;
END
GO

-- sp_UserLessons_GetByUser
IF OBJECT_ID('sp_UserLessons_GetByUser', 'P') IS NOT NULL DROP PROCEDURE sp_UserLessons_GetByUser;
GO
CREATE or alter PROCEDURE sp_UserLessons_GetByUser
  @UserId NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT ul.*, l.Title AS LessonTitle
  FROM UserLessons ul
    INNER JOIN Lessons l ON l.Id = ul.LessonId
  WHERE ul.UserId = @UserId;
END
GO
