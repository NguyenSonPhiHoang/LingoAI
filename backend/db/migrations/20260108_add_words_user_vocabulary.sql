-- Migration: add Words + UserVocabulary (per-user) tables and procedures

-- =============================================
-- WORDS (global)
-- =============================================
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

  -- Unique index for normalized term lookup
  IF NOT EXISTS (
    SELECT 1
  FROM sys.indexes
  WHERE name = 'UX_Words_TermNormalized' AND object_id = OBJECT_ID('dbo.Words')
  )
  BEGIN
    CREATE UNIQUE INDEX UX_Words_TermNormalized ON dbo.Words(TermNormalized);
  END
END
GO

-- =============================================
-- USER VOCABULARY (per-user details + metadata)
-- =============================================
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
    Synonyms NVARCHAR(MAX) NULL,
    -- JSON array
    Antonyms NVARCHAR(MAX) NULL,
    -- JSON array
    IrregularForms NVARCHAR(MAX) NULL,
    -- JSON object

    Favorite BIT NULL CONSTRAINT DF_UserVocabulary_Favorite DEFAULT 0,
    Topic NVARCHAR(200) NULL,
    CreatedAt DATETIMEOFFSET NULL,
    UpdatedAt DATETIMEOFFSET NULL
  );

  -- Unique constraint per user per word
  IF NOT EXISTS (
    SELECT 1
  FROM sys.indexes
  WHERE name = 'UX_UserVocabulary_User_Word' AND object_id = OBJECT_ID('dbo.UserVocabulary')
  )
  BEGIN
    CREATE UNIQUE INDEX UX_UserVocabulary_User_Word ON dbo.UserVocabulary(UserId, WordId);
  END

  -- Optional FKs
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
GO

-- =============================================
-- WORDS PROCEDURES
-- =============================================
IF OBJECT_ID('sp_Words_Insert', 'P') IS NOT NULL DROP PROCEDURE sp_Words_Insert;
GO
CREATE PROCEDURE sp_Words_Insert
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

IF OBJECT_ID('sp_Words_Update', 'P') IS NOT NULL DROP PROCEDURE sp_Words_Update;
GO
CREATE PROCEDURE sp_Words_Update
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

IF OBJECT_ID('sp_Words_GetById', 'P') IS NOT NULL DROP PROCEDURE sp_Words_GetById;
GO
CREATE PROCEDURE sp_Words_GetById
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

IF OBJECT_ID('sp_Words_GetByNormalized', 'P') IS NOT NULL DROP PROCEDURE sp_Words_GetByNormalized;
GO
CREATE PROCEDURE sp_Words_GetByNormalized
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

IF OBJECT_ID('sp_Words_GetAll', 'P') IS NOT NULL DROP PROCEDURE sp_Words_GetAll;
GO
CREATE PROCEDURE sp_Words_GetAll
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM Words
  ORDER BY TermNormalized ASC;
END
GO

-- =============================================
-- USER VOCABULARY PROCEDURES
-- =============================================
IF OBJECT_ID('sp_UserVocabulary_Upsert', 'P') IS NOT NULL DROP PROCEDURE sp_UserVocabulary_Upsert;
GO
CREATE PROCEDURE sp_UserVocabulary_Upsert
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
      (Id, UserId, WordId, PartOfSpeech, Definition, VietnameseDefinition, Sentence, VietnameseSentence, SentenceAudioUrl, Synonyms, Antonyms, IrregularForms, Favorite, Topic, CreatedAt, UpdatedAt)
    VALUES
      (@Id, @UserId, @WordId, @PartOfSpeech, @Definition, @VietnameseDefinition, @Sentence, @VietnameseSentence, @SentenceAudioUrl, @Synonyms, @Antonyms, @IrregularForms, ISNULL(@Favorite, 0), @Topic, @CreatedAt, @UpdatedAt);

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
        Favorite = ISNULL(@Favorite, Favorite),
        Topic = ISNULL(@Topic, Topic),
        UpdatedAt = ISNULL(@UpdatedAt, UpdatedAt)
    WHERE Id = @ExistingId AND UserId = @UserId;

    SELECT @ExistingId AS Id;
  END
END
GO

IF OBJECT_ID('sp_UserVocabulary_Update', 'P') IS NOT NULL DROP PROCEDURE sp_UserVocabulary_Update;
GO
CREATE PROCEDURE sp_UserVocabulary_Update
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
      Favorite = ISNULL(@Favorite, Favorite),
      Topic = ISNULL(@Topic, Topic),
      UpdatedAt = ISNULL(@UpdatedAt, UpdatedAt)
  WHERE Id = @Id AND UserId = @UserId;
END
GO

IF OBJECT_ID('sp_UserVocabulary_Delete', 'P') IS NOT NULL DROP PROCEDURE sp_UserVocabulary_Delete;
GO
CREATE PROCEDURE sp_UserVocabulary_Delete
  @Id NVARCHAR(100),
  @UserId NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM UserVocabulary WHERE Id = @Id AND UserId = @UserId;
END
GO

IF OBJECT_ID('sp_UserVocabulary_ListByUser', 'P') IS NOT NULL DROP PROCEDURE sp_UserVocabulary_ListByUser;
GO
CREATE PROCEDURE sp_UserVocabulary_ListByUser
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
    uv.Synonyms,
    uv.Antonyms,
    uv.IrregularForms,
    uv.Favorite,
    uv.Topic,
    uv.CreatedAt,
    uv.UpdatedAt,

    w.Id AS WordIdResolved,
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

IF OBJECT_ID('sp_UserVocabulary_GetById', 'P') IS NOT NULL DROP PROCEDURE sp_UserVocabulary_GetById;
GO
CREATE PROCEDURE sp_UserVocabulary_GetById
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
    uv.Synonyms,
    uv.Antonyms,
    uv.IrregularForms,
    uv.Favorite,
    uv.Topic,
    uv.CreatedAt,
    uv.UpdatedAt,

    w.Id AS WordIdResolved,
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
