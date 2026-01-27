-- Migration: add AudioPath column to VtepDocuments for per-document audio files
USE Data_LingoAI
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.VtepDocuments') AND type = 'U')
BEGIN
  IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.VtepDocuments') AND name = 'AudioPath')
  BEGIN
    ALTER TABLE dbo.VtepDocuments ADD AudioPath NVARCHAR(1000) NULL;
  END
END
GO
