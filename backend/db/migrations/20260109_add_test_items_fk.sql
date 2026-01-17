-- Add FK + cascade delete from Tests -> TestItems

IF EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[TestItems]') AND type IN (N'U'))
AND EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Tests]') AND type IN (N'U'))
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_TestItems_Tests'
  )
  BEGIN
    ALTER TABLE dbo.TestItems
      ADD CONSTRAINT FK_TestItems_Tests
      FOREIGN KEY (TestId) REFERENCES dbo.Tests(Id)
      ON DELETE CASCADE;
  END
END
