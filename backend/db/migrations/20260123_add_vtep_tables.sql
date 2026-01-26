-- Migration: add VTEP document and items tables
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[VtepDocuments]') AND type in (N'U'))
BEGIN
  CREATE TABLE dbo.VtepDocuments (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    Title NVARCHAR(400) NULL,
    FileName NVARCHAR(400) NOT NULL,
    FilePath NVARCHAR(1000) NOT NULL,
    PageCount INT NULL,
    TocJson NVARCHAR(MAX) NULL,
    CreatedByUserId NVARCHAR(200) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[VtepItems]') AND type in (N'U'))
BEGIN
  CREATE TABLE dbo.VtepItems (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    DocumentId UNIQUEIDENTIFIER NULL,
    SectionKey NVARCHAR(200) NULL,
    Skill NVARCHAR(50) NULL,
    Part NVARCHAR(200) NULL,
    Prompt NVARCHAR(MAX) NULL,
    OptionsJson NVARCHAR(MAX) NULL,
    AnswerJson NVARCHAR(MAX) NULL,
    MediaUrl NVARCHAR(1000) NULL,
    Difficulty INT NULL,
    CreatedByUserId NVARCHAR(200) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[VtepSets]') AND type in (N'U'))
BEGIN
  CREATE TABLE dbo.VtepSets (
    Id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    Name NVARCHAR(400) NULL,
    ItemsJson NVARCHAR(MAX) NULL,
    CreatedByUserId NVARCHAR(200) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
  );
END
