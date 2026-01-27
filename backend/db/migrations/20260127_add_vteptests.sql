-- Migration: add VtepTests and VtepTestItems
IF NOT EXISTS (
  SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[VtepTests]') AND type in (N'U')
)
BEGIN
  CREATE TABLE dbo.VtepTests
  (
    Id NVARCHAR(100) PRIMARY KEY,
    Title NVARCHAR(500) NULL,
    Description NVARCHAR(MAX) NULL,
    CreatedByUserId NVARCHAR(100) NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_VtepTests_IsActive DEFAULT 0,
    IsPublic BIT NOT NULL CONSTRAINT DF_VtepTests_IsPublic DEFAULT 0,
    CreatedAt DATETIMEOFFSET NULL
  );

  CREATE INDEX IX_VtepTests_CreatedBy_IsActive ON dbo.VtepTests(CreatedByUserId, IsActive) INCLUDE (Title, CreatedAt);

  IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type in (N'U'))
  BEGIN
    IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_VtepTests_Users')
    BEGIN
      ALTER TABLE dbo.VtepTests ADD CONSTRAINT FK_VtepTests_Users FOREIGN KEY (CreatedByUserId) REFERENCES dbo.Users(Id);
    END
  END
END

IF NOT EXISTS (
  SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[VtepTestItems]') AND type in (N'U')
)
BEGIN
  CREATE TABLE dbo.VtepTestItems
  (
    Id NVARCHAR(100) PRIMARY KEY,
    VtepTestId NVARCHAR(100) NOT NULL,
    Ord INT NULL,
    SourceDocumentId NVARCHAR(100) NULL,
    Prompt NVARCHAR(MAX) NULL,
    OptionsJson NVARCHAR(MAX) NULL,
    AnswerJson NVARCHAR(MAX) NULL,
    MediaUrl NVARCHAR(MAX) NULL,
    Difficulty INT NULL,
    CreatedByUserId NVARCHAR(100) NULL,
    CreatedAt DATETIMEOFFSET NULL
  );

  CREATE INDEX IX_VtepTestItems_TestId_Ord ON dbo.VtepTestItems(VtepTestId, Ord) INCLUDE (Prompt, CreatedAt);

  IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[VtepTests]') AND type in (N'U'))
  BEGIN
    IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_VtepTestItems_VtepTests')
    BEGIN
      ALTER TABLE dbo.VtepTestItems ADD CONSTRAINT FK_VtepTestItems_VtepTests FOREIGN KEY (VtepTestId) REFERENCES dbo.VtepTests(Id);
    END
  END
END

GO
