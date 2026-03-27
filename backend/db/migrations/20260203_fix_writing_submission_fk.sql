-- Migration: Fix VtepWritingSubmissions foreign key
-- Problem: TestId was referencing VtepWritingTests (template), but we're sending Tests.Id (instance)
-- Solution: Rename TestId -> TestTemplateId, add new TestInstanceId for Tests table

BEGIN TRANSACTION;

-- Step 1: Drop indexes that depend on TestId
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_VtepWritingSubmissions_Test' AND object_id = OBJECT_ID('dbo.VtepWritingSubmissions'))
BEGIN
  DROP INDEX IX_VtepWritingSubmissions_Test ON dbo.VtepWritingSubmissions;
  PRINT 'Dropped index IX_VtepWritingSubmissions_Test';
END

-- Step 2: Drop existing FK constraint
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_VtepWritingSubmissions_Test')
BEGIN
  ALTER TABLE dbo.VtepWritingSubmissions
    DROP CONSTRAINT FK_VtepWritingSubmissions_Test;
  PRINT 'Dropped FK_VtepWritingSubmissions_Test';
END

-- Step 3: Rename TestId to TestTemplateId (preserve existing data)
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.VtepWritingSubmissions') AND name = 'TestId')
BEGIN
  EXEC sp_rename 'dbo.VtepWritingSubmissions.TestId', 'TestTemplateId', 'COLUMN';
  PRINT 'Renamed TestId -> TestTemplateId';
END

-- Step 4: Add new TestInstanceId column for Tests table reference
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.VtepWritingSubmissions') AND name = 'TestInstanceId')
BEGIN
  ALTER TABLE dbo.VtepWritingSubmissions
    ADD TestInstanceId NVARCHAR(100) NULL;
  PRINT 'Added TestInstanceId column';
END

-- Step 5: Add FK constraint for TestTemplateId -> VtepWritingTests
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_VtepWritingSubmissions_TestTemplate')
BEGIN
  ALTER TABLE dbo.VtepWritingSubmissions
    ADD CONSTRAINT FK_VtepWritingSubmissions_TestTemplate
      FOREIGN KEY (TestTemplateId)
      REFERENCES dbo.VtepWritingTests(Id);
  PRINT 'Added FK_VtepWritingSubmissions_TestTemplate';
END

-- Step 6: Add FK constraint for TestInstanceId -> Tests
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_VtepWritingSubmissions_TestInstance')
BEGIN
  ALTER TABLE dbo.VtepWritingSubmissions
    ADD CONSTRAINT FK_VtepWritingSubmissions_TestInstance
      FOREIGN KEY (TestInstanceId)
      REFERENCES dbo.Tests(Id);
  PRINT 'Added FK_VtepWritingSubmissions_TestInstance';
END

-- Step 7: Add index for TestTemplateId queries
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_VtepWritingSubmissions_TestTemplate')
BEGIN
  CREATE INDEX IX_VtepWritingSubmissions_TestTemplate
    ON dbo.VtepWritingSubmissions(TestTemplateId);
  PRINT 'Added index IX_VtepWritingSubmissions_TestTemplate';
END

-- Step 8: Add index for TestInstanceId queries
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_VtepWritingSubmissions_TestInstance')
BEGIN
  CREATE INDEX IX_VtepWritingSubmissions_TestInstance
    ON dbo.VtepWritingSubmissions(TestInstanceId);
  PRINT 'Added index IX_VtepWritingSubmissions_TestInstance';
END

COMMIT TRANSACTION;

PRINT '✅ Migration completed: VtepWritingSubmissions FK fixed';
PRINT '   - TestId renamed to TestTemplateId (references VtepWritingTests)';
PRINT '   - TestInstanceId added (references Tests - for skill tracking)';
