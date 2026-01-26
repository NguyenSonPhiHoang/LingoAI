-- Migration: allow NULL for FilePath in VtepDocuments
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.VtepDocuments') AND name = 'FilePath')
BEGIN
  ALTER TABLE dbo.VtepDocuments ALTER COLUMN FilePath NVARCHAR(1000) NULL;
END
