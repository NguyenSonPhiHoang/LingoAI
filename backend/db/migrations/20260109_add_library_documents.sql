-- Add dbo.LibraryDocuments: per-user library materials (documents/URLs) used by the Next.js Library feature.

IF NOT EXISTS (
  SELECT 1
  FROM sys.objects
  WHERE object_id = OBJECT_ID(N'[dbo].[LibraryDocuments]') AND type IN (N'U')
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
  IF EXISTS (
    SELECT 1
    FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type IN (N'U')
  )
  BEGIN
    IF NOT EXISTS (
      SELECT 1
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
