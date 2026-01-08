-- Migration: add LearnCount tracking for per-user vocabulary

IF EXISTS (SELECT *
FROM sys.objects
WHERE object_id = OBJECT_ID(N'[dbo].[UserVocabulary]') AND type in (N'U'))
BEGIN
  IF NOT EXISTS (
    SELECT *
  FROM sys.columns
  WHERE Name = N'LearnCount' AND Object_ID = Object_ID(N'[dbo].[UserVocabulary]')
  )
  BEGIN
    ALTER TABLE dbo.UserVocabulary
      ADD LearnCount INT NOT NULL CONSTRAINT DF_UserVocabulary_LearnCount DEFAULT 0;
  END
END
GO
