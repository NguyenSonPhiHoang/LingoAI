-- Add dbo.LibraryContents: per-user notes/attachments linked to LibraryDocuments.

IF NOT EXISTS (
  SELECT 1
  FROM sys.objects
  WHERE object_id = OBJECT_ID(N'[dbo].[LibraryContents]') AND type IN (N'U')
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
    SELECT 1
    FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type IN (N'U')
  )
  BEGIN
    IF NOT EXISTS (
      SELECT 1
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
    SELECT 1
    FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[LibraryDocuments]') AND type IN (N'U')
  )
  BEGIN
    IF NOT EXISTS (
      SELECT 1
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
