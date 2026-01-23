-- Add IsNotePage flag for a single "note page" per (UserId, DocId)

IF COL_LENGTH('dbo.LibraryContents', 'IsNotePage') IS NULL
BEGIN
  ALTER TABLE dbo.LibraryContents
    ADD IsNotePage BIT NOT NULL CONSTRAINT DF_LibraryContents_IsNotePage DEFAULT (0);
END

-- Ensure at most one note page per user+document.
IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'UX_LibraryContents_User_Doc_NotePage'
    AND object_id = OBJECT_ID('dbo.LibraryContents')
)
BEGIN
  CREATE UNIQUE INDEX UX_LibraryContents_User_Doc_NotePage
    ON dbo.LibraryContents(UserId, DocId)
    WHERE IsNotePage = 1;
END
