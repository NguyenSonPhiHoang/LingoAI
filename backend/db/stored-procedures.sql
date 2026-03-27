-- =============================================
-- STORED PROCEDURES FOR LINGOAI
-- Naming convention: sp_[TableName]_[Action]
-- USERS

-- sp_Users_Insert
IF OBJECT_ID('sp_Users_Insert', 'P') IS NOT NULL DROP PROCEDURE sp_Users_Insert;
GO
CREATE   PROCEDURE sp_Users_Insert
  @Id NVARCHAR(100),
  @Email NVARCHAR(256),
  @DisplayName NVARCHAR(256),
  @PasswordHash NVARCHAR(200),
  @RoleId NVARCHAR(100),
  @Status NVARCHAR(50),
  @OmniChatEnabled BIT,
  @CreatedAt DATETIMEOFFSET
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO Users
    (Id, Email, DisplayName, PasswordHash, RoleId, Status, OmniChatEnabled, CreatedAt)
  VALUES
    (@Id, @Email, @DisplayName, @PasswordHash, @RoleId, ISNULL(@Status, 'pending'), ISNULL(@OmniChatEnabled, 1), @CreatedAt);
END
-- =============================================
-- USER SETTINGS
-- =============================================

-- sp_UserSettings_Get
IF OBJECT_ID('sp_UserSettings_Get', 'P') IS NOT NULL DROP PROCEDURE sp_UserSettings_Get;
GO
CREATE  or alter PROCEDURE sp_UserSettings_Get
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
CREATE   PROCEDURE sp_UserSettings_Upsert
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
CREATE   PROCEDURE sp_UserProjects_Insert
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
CREATE   PROCEDURE sp_UserProjects_Update
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
CREATE   PROCEDURE sp_UserProjects_Delete
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
CREATE   PROCEDURE sp_UserProjects_GetById
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
CREATE   PROCEDURE sp_UserProjects_ListByUser
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
CREATE or alter   PROCEDURE sp_Users_Update
  @Id NVARCHAR(100),
  @Email NVARCHAR(256),
  @DisplayName NVARCHAR(256),
  @PasswordHash NVARCHAR(200),
  @RoleId NVARCHAR(100),
  @Status NVARCHAR(50),
  @OmniChatEnabled BIT
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE Users
  SET Email = @Email,
      DisplayName = @DisplayName,
      PasswordHash = ISNULL(@PasswordHash, PasswordHash),
      RoleId = @RoleId,
      Status = ISNULL(@Status, Status),
      OmniChatEnabled = ISNULL(@OmniChatEnabled, OmniChatEnabled)
  WHERE Id = @Id;
END
GO

-- sp_Users_Upsert
IF OBJECT_ID('sp_Users_Upsert', 'P') IS NOT NULL DROP PROCEDURE sp_Users_Upsert;
GO
CREATE    PROCEDURE sp_Users_Upsert
  @Id NVARCHAR(100),
  @Email NVARCHAR(256),
  @DisplayName NVARCHAR(256),
  @Status NVARCHAR(50),
  @OmniChatEnabled BIT,
  @CreatedAt DATETIMEOFFSET
AS
BEGIN
  SET NOCOUNT ON;
  MERGE INTO Users WITH (HOLDLOCK) AS target
  USING (SELECT @Id AS Id) AS source
  ON (target.Id = source.Id)
  WHEN MATCHED THEN
    UPDATE SET Email = @Email, DisplayName = @DisplayName, Status = ISNULL(@Status, Status), OmniChatEnabled = ISNULL(@OmniChatEnabled, OmniChatEnabled), CreatedAt = @CreatedAt
  WHEN NOT MATCHED THEN
    INSERT (Id, Email, DisplayName, Status, OmniChatEnabled, CreatedAt) VALUES (@Id, @Email, @DisplayName, ISNULL(@Status, 'pending'), ISNULL(@OmniChatEnabled, 1), @CreatedAt);
END
GO

-- sp_Users_Delete
IF OBJECT_ID('sp_Users_Delete', 'P') IS NOT NULL DROP PROCEDURE sp_Users_Delete;
GO
CREATE   PROCEDURE sp_Users_Delete
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
CREATE   PROCEDURE sp_Users_GetById
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
CREATE   PROCEDURE sp_Users_GetByEmail
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
CREATE   PROCEDURE sp_Users_GetAll
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
CREATE   PROCEDURE sp_Users_VerifyCredentials
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
CREATE   PROCEDURE sp_Users_AssignRole
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
CREATE   PROCEDURE sp_Roles_Insert
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
CREATE   PROCEDURE sp_Roles_Update
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
CREATE   PROCEDURE sp_Roles_Delete
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
CREATE   PROCEDURE sp_Roles_GetById
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
CREATE   PROCEDURE sp_Roles_GetByName
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
CREATE   PROCEDURE sp_Roles_GetAll
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
CREATE   PROCEDURE sp_Lessons_Insert
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
CREATE   PROCEDURE sp_Lessons_Update
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
CREATE   PROCEDURE sp_Lessons_Delete
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
CREATE   PROCEDURE sp_Lessons_GetById
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
CREATE   PROCEDURE sp_Lessons_GetAll
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
CREATE   PROCEDURE sp_Lessons_GetByAuthor
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
CREATE   PROCEDURE sp_Vocabulary_Insert
  @Id NVARCHAR(100),
  @Word NVARCHAR(200),
  @Lemma NVARCHAR(200),
  @Definition NVARCHAR(MAX),
  @Example NVARCHAR(MAX),
  @PartOfSpeech NVARCHAR(100),
  @Pronunciation NVARCHAR(200),
  @AudioUrl NVARCHAR(MAX),
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
CREATE   PROCEDURE sp_Vocabulary_Update
  @Id NVARCHAR(100),
  @Word NVARCHAR(200),
  @Lemma NVARCHAR(200),
  @Definition NVARCHAR(MAX),
  @Example NVARCHAR(MAX),
  @PartOfSpeech NVARCHAR(100),
  @Pronunciation NVARCHAR(200),
  @AudioUrl NVARCHAR(MAX)
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
CREATE   PROCEDURE sp_Vocabulary_Delete
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
CREATE   PROCEDURE sp_Vocabulary_GetById
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
CREATE   PROCEDURE sp_Vocabulary_GetAll
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM Vocabulary;
END
GO

-- =============================================
-- WORDS (global)
-- =============================================

-- sp_Words_Insert
IF OBJECT_ID('sp_Words_Insert', 'P') IS NOT NULL DROP PROCEDURE sp_Words_Insert;
GO
CREATE   PROCEDURE sp_Words_Insert
  @Id NVARCHAR(100),
  @Term NVARCHAR(200),
  @TermNormalized NVARCHAR(200),
  @Pronunciation NVARCHAR(200),
  @AudioUrl NVARCHAR(MAX),
  @CreatedAt DATETIMEOFFSET
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO Words
    (Id, Term, TermNormalized, Pronunciation, AudioUrl, CreatedAt)
  VALUES
    (@Id, @Term, @TermNormalized, @Pronunciation, @AudioUrl, @CreatedAt);
END
GO

-- sp_Words_Update
IF OBJECT_ID('sp_Words_Update', 'P') IS NOT NULL DROP PROCEDURE sp_Words_Update;
GO
CREATE   PROCEDURE sp_Words_Update
  @Id NVARCHAR(100),
  @Term NVARCHAR(200),
  @TermNormalized NVARCHAR(200),
  @Pronunciation NVARCHAR(200),
  @AudioUrl NVARCHAR(MAX)
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE Words
  SET Term = ISNULL(@Term, Term),
      TermNormalized = ISNULL(@TermNormalized, TermNormalized),
      Pronunciation = ISNULL(@Pronunciation, Pronunciation),
      AudioUrl = ISNULL(@AudioUrl, AudioUrl)
  WHERE Id = @Id;
END
GO

-- sp_Words_GetById
IF OBJECT_ID('sp_Words_GetById', 'P') IS NOT NULL DROP PROCEDURE sp_Words_GetById;
GO
CREATE   PROCEDURE sp_Words_GetById
  @Id NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT TOP 1
    *
  FROM Words
  WHERE Id = @Id;
END
GO

-- sp_Words_GetByNormalized
IF OBJECT_ID('sp_Words_GetByNormalized', 'P') IS NOT NULL DROP PROCEDURE sp_Words_GetByNormalized;
GO
CREATE   PROCEDURE sp_Words_GetByNormalized
  @TermNormalized NVARCHAR(200)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT TOP 1
    *
  FROM Words
  WHERE TermNormalized = @TermNormalized;
END
GO

-- sp_Words_GetAll
IF OBJECT_ID('sp_Words_GetAll', 'P') IS NOT NULL DROP PROCEDURE sp_Words_GetAll;
GO
CREATE   PROCEDURE sp_Words_GetAll
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM Words
  ORDER BY TermNormalized ASC;
END
GO

-- =============================================
-- USER VOCABULARY (per-user)
-- =============================================

-- sp_UserVocabulary_Upsert
IF OBJECT_ID('sp_UserVocabulary_Upsert', 'P') IS NOT NULL DROP PROCEDURE sp_UserVocabulary_Upsert;
GO
CREATE   PROCEDURE sp_UserVocabulary_Upsert
  @Id NVARCHAR(100),
  @UserId NVARCHAR(100),
  @WordId NVARCHAR(100),
  @PartOfSpeech NVARCHAR(100),
  @Definition NVARCHAR(MAX),
  @VietnameseDefinition NVARCHAR(MAX),
  @Sentence NVARCHAR(MAX),
  @VietnameseSentence NVARCHAR(MAX),
  @SentenceAudioUrl NVARCHAR(MAX),
  @Synonyms NVARCHAR(MAX),
  @Antonyms NVARCHAR(MAX),
  @IrregularForms NVARCHAR(MAX),
  @WordForms NVARCHAR(MAX),
  @Favorite BIT,
  @Topic NVARCHAR(200),
  @CreatedAt DATETIMEOFFSET,
  @UpdatedAt DATETIMEOFFSET
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @ExistingId NVARCHAR(100);
  SELECT TOP 1
    @ExistingId = Id
  FROM UserVocabulary
  WHERE UserId = @UserId AND WordId = @WordId;

  IF @ExistingId IS NULL
  BEGIN
    INSERT INTO UserVocabulary
      (Id, UserId, WordId, PartOfSpeech, Definition, VietnameseDefinition, Sentence, VietnameseSentence, SentenceAudioUrl, Synonyms, Antonyms, IrregularForms, WordForms, Favorite, Topic, CreatedAt, UpdatedAt)
    VALUES
      (@Id, @UserId, @WordId, @PartOfSpeech, @Definition, @VietnameseDefinition, @Sentence, @VietnameseSentence, @SentenceAudioUrl, @Synonyms, @Antonyms, @IrregularForms, @WordForms, ISNULL(@Favorite, 0), @Topic, @CreatedAt, @UpdatedAt);

    SELECT @Id AS Id;
  END
  ELSE
  BEGIN
    UPDATE UserVocabulary
    SET PartOfSpeech = ISNULL(@PartOfSpeech, PartOfSpeech),
        Definition = ISNULL(@Definition, Definition),
        VietnameseDefinition = ISNULL(@VietnameseDefinition, VietnameseDefinition),
        Sentence = ISNULL(@Sentence, Sentence),
        VietnameseSentence = ISNULL(@VietnameseSentence, VietnameseSentence),
        SentenceAudioUrl = ISNULL(@SentenceAudioUrl, SentenceAudioUrl),
        Synonyms = ISNULL(@Synonyms, Synonyms),
        Antonyms = ISNULL(@Antonyms, Antonyms),
        IrregularForms = ISNULL(@IrregularForms, IrregularForms),
      WordForms = ISNULL(@WordForms, WordForms),
        Favorite = ISNULL(@Favorite, Favorite),
        Topic = ISNULL(@Topic, Topic),
        UpdatedAt = ISNULL(@UpdatedAt, UpdatedAt)
    WHERE Id = @ExistingId AND UserId = @UserId;

    SELECT @ExistingId AS Id;
  END
END
GO

-- sp_UserVocabulary_Update
IF OBJECT_ID('sp_UserVocabulary_Update', 'P') IS NOT NULL DROP PROCEDURE sp_UserVocabulary_Update;
GO
CREATE   PROCEDURE sp_UserVocabulary_Update
  @Id NVARCHAR(100),
  @UserId NVARCHAR(100),
  @PartOfSpeech NVARCHAR(100),
  @Definition NVARCHAR(MAX),
  @VietnameseDefinition NVARCHAR(MAX),
  @Sentence NVARCHAR(MAX),
  @VietnameseSentence NVARCHAR(MAX),
  @SentenceAudioUrl NVARCHAR(MAX),
  @Synonyms NVARCHAR(MAX),
  @Antonyms NVARCHAR(MAX),
  @IrregularForms NVARCHAR(MAX),
  @WordForms NVARCHAR(MAX),
  @Favorite BIT,
  @Topic NVARCHAR(200),
  @UpdatedAt DATETIMEOFFSET
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE UserVocabulary
  SET PartOfSpeech = ISNULL(@PartOfSpeech, PartOfSpeech),
      Definition = ISNULL(@Definition, Definition),
      VietnameseDefinition = ISNULL(@VietnameseDefinition, VietnameseDefinition),
      Sentence = ISNULL(@Sentence, Sentence),
      VietnameseSentence = ISNULL(@VietnameseSentence, VietnameseSentence),
      SentenceAudioUrl = ISNULL(@SentenceAudioUrl, SentenceAudioUrl),
      Synonyms = ISNULL(@Synonyms, Synonyms),
      Antonyms = ISNULL(@Antonyms, Antonyms),
      IrregularForms = ISNULL(@IrregularForms, IrregularForms),
      WordForms = ISNULL(@WordForms, WordForms),
      Favorite = ISNULL(@Favorite, Favorite),
      Topic = ISNULL(@Topic, Topic),
      UpdatedAt = ISNULL(@UpdatedAt, UpdatedAt)
  WHERE Id = @Id AND UserId = @UserId;
END
GO

-- sp_UserVocabulary_Delete
IF OBJECT_ID('sp_UserVocabulary_Delete', 'P') IS NOT NULL DROP PROCEDURE sp_UserVocabulary_Delete;
GO
CREATE   PROCEDURE sp_UserVocabulary_Delete
  @Id NVARCHAR(100),
  @UserId NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM UserVocabulary WHERE Id = @Id AND UserId = @UserId;
END
GO

-- sp_UserVocabulary_ListByUser
IF OBJECT_ID('sp_UserVocabulary_ListByUser', 'P') IS NOT NULL DROP PROCEDURE sp_UserVocabulary_ListByUser;
GO
CREATE   PROCEDURE sp_UserVocabulary_ListByUser
  @UserId NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    uv.Id AS UserVocabularyId,
    uv.UserId,
    uv.WordId,
    uv.PartOfSpeech,
    uv.Definition,
    uv.VietnameseDefinition,
    uv.Sentence,
    uv.VietnameseSentence,
    uv.SentenceAudioUrl,
    uv.LearnCount,
    uv.Synonyms,
    uv.Antonyms,
    uv.IrregularForms,
    uv.WordForms,
    uv.Favorite,
    uv.Topic,
    uv.CreatedAt,
    uv.UpdatedAt,
    w.Term,
    w.TermNormalized,
    w.Pronunciation,
    w.AudioUrl,
    w.CreatedAt AS WordCreatedAt
  FROM UserVocabulary uv
    INNER JOIN Words w ON w.Id = uv.WordId
  WHERE uv.UserId = @UserId
  ORDER BY uv.CreatedAt DESC;
END
GO

-- sp_UserVocabulary_GetById
IF OBJECT_ID('sp_UserVocabulary_GetById', 'P') IS NOT NULL DROP PROCEDURE sp_UserVocabulary_GetById;
GO
CREATE   PROCEDURE sp_UserVocabulary_GetById
  @Id NVARCHAR(100),
  @UserId NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;

  SELECT TOP 1
    uv.Id AS UserVocabularyId,
    uv.UserId,
    uv.WordId,
    uv.PartOfSpeech,
    uv.Definition,
    uv.VietnameseDefinition,
    uv.Sentence,
    uv.VietnameseSentence,
    uv.SentenceAudioUrl,
    uv.LearnCount,
    uv.Synonyms,
    uv.Antonyms,
    uv.IrregularForms,
    uv.WordForms,
    uv.Favorite,
    uv.Topic,
    uv.CreatedAt,
    uv.UpdatedAt,
    w.Term,
    w.TermNormalized,
    w.Pronunciation,
    w.AudioUrl,
    w.CreatedAt AS WordCreatedAt
  FROM UserVocabulary uv
    INNER JOIN Words w ON w.Id = uv.WordId
  WHERE uv.Id = @Id AND uv.UserId = @UserId;
END
GO

-- sp_UserVocabulary_IncrementLearnCount
IF OBJECT_ID('sp_UserVocabulary_IncrementLearnCount', 'P') IS NOT NULL DROP PROCEDURE sp_UserVocabulary_IncrementLearnCount;
GO
CREATE   PROCEDURE sp_UserVocabulary_IncrementLearnCount
  @Id NVARCHAR(100),
  @UserId NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;

  UPDATE uv
  SET
    LearnCount = ISNULL(uv.LearnCount, 0) + 1,
    Favorite = CASE
      WHEN ISNULL(uv.LearnCount, 0) + 1 > 20 THEN 0
      WHEN ISNULL(uv.LearnCount, 0) + 1 = 1 THEN 1
      ELSE uv.Favorite
    END,
    UpdatedAt = SYSDATETIMEOFFSET()
  FROM UserVocabulary uv
  WHERE uv.Id = @Id AND uv.UserId = @UserId;

  SELECT TOP 1
    uv.LearnCount,
    uv.Favorite
  FROM UserVocabulary uv
  WHERE uv.Id = @Id AND uv.UserId = @UserId;
END
GO

-- =============================================
-- LESSON_VOCABULARY (Junction)
-- =============================================

-- sp_LessonVocabulary_Insert
IF OBJECT_ID('sp_LessonVocabulary_Insert', 'P') IS NOT NULL DROP PROCEDURE sp_LessonVocabulary_Insert;
GO
CREATE   PROCEDURE sp_LessonVocabulary_Insert
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
CREATE   PROCEDURE sp_LessonVocabulary_Delete
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
CREATE   PROCEDURE sp_LessonVocabulary_GetByLesson
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
CREATE   PROCEDURE sp_Storybooks_Insert
  @Id NVARCHAR(100),
  @Title NVARCHAR(500),
  @Description NVARCHAR(MAX),
  @Language NVARCHAR(50),
  @AuthorId NVARCHAR(100),
  @Level NVARCHAR(50),
  @Format NVARCHAR(50),
  @Status NVARCHAR(50),
  @KeyVocabulary NVARCHAR(MAX),
  @EnglishStory NVARCHAR(MAX),
  @VietnameseStory NVARCHAR(MAX),
  @InterspersedStory NVARCHAR(MAX),
  @FullEnglishStory NVARCHAR(MAX),
  @TitleAudioUrl NVARCHAR(MAX),
  @EnglishContentAudioUrl NVARCHAR(MAX),
  @VietnameseContentAudioUrl NVARCHAR(MAX),
  @IsPublished BIT,
  @CreatedAt DATETIMEOFFSET,
  @UpdatedAt DATETIMEOFFSET
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO Storybooks
    (Id, Title, Description, Language, AuthorId, Level, Format, Status, KeyVocabulary,
    EnglishStory, VietnameseStory, InterspersedStory, FullEnglishStory,
    TitleAudioUrl, EnglishContentAudioUrl, VietnameseContentAudioUrl,
    IsPublished, CreatedAt, UpdatedAt)
  VALUES
    (@Id, @Title, @Description, @Language, @AuthorId, @Level, @Format, @Status, @KeyVocabulary,
      @EnglishStory, @VietnameseStory, @InterspersedStory, @FullEnglishStory,
      @TitleAudioUrl, @EnglishContentAudioUrl, @VietnameseContentAudioUrl,
      @IsPublished, @CreatedAt, @UpdatedAt);
END
GO

-- sp_Storybooks_Update
IF OBJECT_ID('sp_Storybooks_Update', 'P') IS NOT NULL DROP PROCEDURE sp_Storybooks_Update;
GO
CREATE   PROCEDURE sp_Storybooks_Update
  @Id NVARCHAR(100),
  @Title NVARCHAR(500),
  @Description NVARCHAR(MAX),
  @Language NVARCHAR(50),
  @Level NVARCHAR(50),
  @Format NVARCHAR(50),
  @Status NVARCHAR(50),
  @KeyVocabulary NVARCHAR(MAX),
  @EnglishStory NVARCHAR(MAX),
  @VietnameseStory NVARCHAR(MAX),
  @InterspersedStory NVARCHAR(MAX),
  @FullEnglishStory NVARCHAR(MAX),
  @TitleAudioUrl NVARCHAR(MAX),
  @EnglishContentAudioUrl NVARCHAR(MAX),
  @VietnameseContentAudioUrl NVARCHAR(MAX),
  @IsPublished BIT,
  @AuthorId NVARCHAR(100),
  @UpdatedAt DATETIMEOFFSET
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE Storybooks
  SET Title = ISNULL(@Title, Title),
      Description = ISNULL(@Description, Description),
      Language = ISNULL(@Language, Language),
      Level = ISNULL(@Level, Level),
      Format = ISNULL(@Format, Format),
      Status = ISNULL(@Status, Status),
      KeyVocabulary = ISNULL(@KeyVocabulary, KeyVocabulary),
      EnglishStory = ISNULL(@EnglishStory, EnglishStory),
      VietnameseStory = ISNULL(@VietnameseStory, VietnameseStory),
      InterspersedStory = ISNULL(@InterspersedStory, InterspersedStory),
      FullEnglishStory = ISNULL(@FullEnglishStory, FullEnglishStory),
      TitleAudioUrl = ISNULL(@TitleAudioUrl, TitleAudioUrl),
      EnglishContentAudioUrl = ISNULL(@EnglishContentAudioUrl, EnglishContentAudioUrl),
      VietnameseContentAudioUrl = ISNULL(@VietnameseContentAudioUrl, VietnameseContentAudioUrl),
      IsPublished = ISNULL(@IsPublished, IsPublished),
      UpdatedAt = @UpdatedAt
  WHERE Id = @Id AND (@AuthorId IS NULL OR AuthorId = @AuthorId);
END
GO

-- sp_Storybooks_ListByAuthor
IF OBJECT_ID('sp_Storybooks_ListByAuthor', 'P') IS NOT NULL DROP PROCEDURE sp_Storybooks_ListByAuthor;
GO
CREATE   PROCEDURE sp_Storybooks_ListByAuthor
  @AuthorId NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM Storybooks
  WHERE AuthorId = @AuthorId
  ORDER BY CreatedAt DESC;
END
GO

-- sp_Storybooks_Delete
IF OBJECT_ID('sp_Storybooks_Delete', 'P') IS NOT NULL DROP PROCEDURE sp_Storybooks_Delete;
GO
CREATE   PROCEDURE sp_Storybooks_Delete
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
CREATE   PROCEDURE sp_Storybooks_GetById
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
CREATE   PROCEDURE sp_Storybooks_GetAll
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
CREATE   PROCEDURE sp_StorybookPages_Insert
  @Id NVARCHAR(100),
  @StorybookId NVARCHAR(100),
  @PageNumber INT,
  @Content NVARCHAR(MAX),
  @AudioUrl NVARCHAR(MAX)
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
CREATE   PROCEDURE sp_StorybookPages_Update
  @Id NVARCHAR(100),
  @PageNumber INT,
  @Content NVARCHAR(MAX),
  @AudioUrl NVARCHAR(MAX)
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
CREATE   PROCEDURE sp_StorybookPages_Delete
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
CREATE   PROCEDURE sp_StorybookPages_GetByStorybook
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
CREATE   PROCEDURE sp_Tests_Insert
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

  -- Normalize all stored timestamps to UTC+7 (Vietnam).
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
CREATE   PROCEDURE sp_Tests_Update
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

  -- Normalize all stored timestamps to UTC+7 (Vietnam).
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

-- sp_Tests_Delete
IF OBJECT_ID('sp_Tests_Delete', 'P') IS NOT NULL DROP PROCEDURE sp_Tests_Delete;
GO
CREATE   PROCEDURE sp_Tests_Delete
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
CREATE   PROCEDURE sp_Tests_GetById
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
CREATE   PROCEDURE sp_UserProjects_Insert
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
CREATE   PROCEDURE sp_UserProjects_Update
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
CREATE   PROCEDURE sp_UserProjects_Delete
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
CREATE   PROCEDURE sp_UserProjects_GetById
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
CREATE   PROCEDURE sp_UserProjects_ListByUser
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
CREATE   PROCEDURE sp_UserProfiles_GetByUserId
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
CREATE   PROCEDURE sp_UserProfiles_Upsert
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
CREATE   PROCEDURE sp_Tests_GetByUser
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
-- TEST ITEMS (per-question/per-item results)
-- =============================================

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

  -- Normalize all stored timestamps to UTC+7 (Vietnam).
  DECLARE @NowLocal DATETIMEOFFSET = (SYSDATETIMEOFFSET() AT TIME ZONE 'SE Asia Standard Time');
  DECLARE @CreatedAtLocal DATETIMEOFFSET =
    CASE WHEN @CreatedAt IS NULL THEN @NowLocal ELSE SWITCHOFFSET(@CreatedAt, '+07:00') END;

  INSERT INTO TestItems
    (Id, TestId, UserId, Type, Skill, Kind, ItemKey, IsCorrect, Score, Data, CreatedAt)
  VALUES
    (@Id, @TestId, @UserId, @Type, @Skill, @Kind, @ItemKey, @IsCorrect, @Score, @Data, @CreatedAtLocal);
END
GO

-- sp_TestItems_ListByTest
IF OBJECT_ID('sp_TestItems_ListByTest', 'P') IS NOT NULL DROP PROCEDURE sp_TestItems_ListByTest;
GO
CREATE PROCEDURE sp_TestItems_ListByTest
  @TestId NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM TestItems
  WHERE TestId = @TestId
  ORDER BY CreatedAt ASC;
END
GO

-- sp_TestItems_ListByUser
IF OBJECT_ID('sp_TestItems_ListByUser', 'P') IS NOT NULL DROP PROCEDURE sp_TestItems_ListByUser;
GO
CREATE PROCEDURE sp_TestItems_ListByUser
  @UserId NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM TestItems
  WHERE UserId = @UserId
  ORDER BY CreatedAt DESC;
END
GO

-- sp_TestItems_DeleteByTest
IF OBJECT_ID('sp_TestItems_DeleteByTest', 'P') IS NOT NULL DROP PROCEDURE sp_TestItems_DeleteByTest;
GO
CREATE PROCEDURE sp_TestItems_DeleteByTest
  @TestId NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM TestItems WHERE TestId = @TestId;
END
GO

-- =============================================
-- USER_LESSONS (progress)
-- =============================================

-- sp_UserLessons_Upsert
IF OBJECT_ID('sp_UserLessons_Upsert', 'P') IS NOT NULL DROP PROCEDURE sp_UserLessons_Upsert;
GO
CREATE   PROCEDURE sp_UserLessons_Upsert
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
CREATE   PROCEDURE sp_UserLessons_Delete
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
CREATE   PROCEDURE sp_UserLessons_GetByUser
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
