-- Add WordForms JSON storage for per-user vocabulary (noun/verb/adj/adv variants)
IF EXISTS (SELECT *
FROM sys.objects
WHERE object_id = OBJECT_ID(N'[dbo].[UserVocabulary]') AND type in (N'U'))
BEGIN
  IF COL_LENGTH('dbo.UserVocabulary', 'WordForms') IS NULL
  BEGIN
    ALTER TABLE dbo.UserVocabulary ADD WordForms NVARCHAR(MAX) NULL;
  END
END
