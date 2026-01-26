-- Migration: add Description column to VtepDocuments
IF NOT EXISTS (
  SELECT * FROM sys.columns
  WHERE object_id = OBJECT_ID(N'dbo.VtepDocuments') AND name = 'Description'
)
BEGIN
  ALTER TABLE dbo.VtepDocuments ADD Description NVARCHAR(MAX) NULL;
END
