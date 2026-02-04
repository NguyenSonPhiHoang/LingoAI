-- Migration: Create Skills reference table and add FK constraints
-- Purpose: Standardize skill values across all tables
-- Date: 2026-02-03

BEGIN TRANSACTION;

-- =====================================================
-- Step 1: Create Skills reference table
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID('dbo.Skills') AND type = 'U')
BEGIN
  CREATE TABLE dbo.Skills (
    Id NVARCHAR(50) NOT NULL PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    DisplayName NVARCHAR(100) NOT NULL,
    Description NVARCHAR(500) NULL,
    Category NVARCHAR(50) NULL, -- 'language', 'cognitive', 'technical'
    SortOrder INT NOT NULL DEFAULT 0,
    IsActive BIT NOT NULL DEFAULT 1,
    CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    UpdatedAt DATETIMEOFFSET NULL
  );

  -- Index for quick lookups
  CREATE INDEX IX_Skills_IsActive_SortOrder
    ON dbo.Skills(IsActive, SortOrder);

  PRINT 'Created Skills reference table';
END
ELSE
BEGIN
  PRINT 'Skills table already exists';
END

-- =====================================================
-- Step 2: Insert standard skill values
-- =====================================================
-- Use MERGE to avoid duplicates on re-run
MERGE INTO dbo.Skills AS target
USING (
  VALUES
    ('Listening', 'Listening', 'Listening Comprehension', 'Ability to understand spoken English', 'language', 1),
    ('Speaking', 'Speaking', 'Speaking Production', 'Ability to produce spoken English', 'language', 2),
    ('Reading', 'Reading', 'Reading Comprehension', 'Ability to understand written English', 'language', 3),
    ('Writing', 'Writing', 'Writing Production', 'Ability to produce written English', 'language', 4),
    ('Pronunciation', 'Pronunciation', 'Pronunciation', 'Ability to pronounce English correctly', 'language', 5),
    ('vocabulary', 'Vocabulary', 'Vocabulary Knowledge', 'Knowledge of English vocabulary', 'language', 6),
    ('Grammar', 'Grammar', 'Grammar Knowledge', 'Knowledge of English grammar rules', 'language', 7),
    ('Listening/Reading', 'Listening/Reading', 'Combined Listening and Reading', 'Combined listening and reading skills', 'language', 8)
) AS source (Id, Name, DisplayName, Description, Category, SortOrder)
ON target.Id = source.Id
WHEN NOT MATCHED THEN
  INSERT (Id, Name, DisplayName, Description, Category, SortOrder, IsActive, CreatedAt)
  VALUES (source.Id, source.Name, source.DisplayName, source.Description, source.Category, source.SortOrder, 1, SYSDATETIMEOFFSET())
WHEN MATCHED THEN
  UPDATE SET
    Name = source.Name,
    DisplayName = source.DisplayName,
    Description = source.Description,
    Category = source.Category,
    SortOrder = source.SortOrder,
    UpdatedAt = SYSDATETIMEOFFSET();

PRINT 'Inserted/Updated standard skill values';

-- =====================================================
-- Step 3: Add FK constraint to Tests table
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Tests_Skill')
BEGIN
  -- Note: Tests.Skill is nullable, so NULL values are allowed
  ALTER TABLE dbo.Tests
    ADD CONSTRAINT FK_Tests_Skill
      FOREIGN KEY (Skill)
      REFERENCES dbo.Skills(Id);
  
  PRINT 'Added FK constraint FK_Tests_Skill';
END
ELSE
BEGIN
  PRINT 'FK constraint FK_Tests_Skill already exists';
END

-- =====================================================
-- Step 4: Add FK constraint to TestItems table
-- =====================================================
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_TestItems_Skill')
BEGIN
  ALTER TABLE dbo.TestItems
    ADD CONSTRAINT FK_TestItems_Skill
      FOREIGN KEY (Skill)
      REFERENCES dbo.Skills(Id);
  
  PRINT 'Added FK constraint FK_TestItems_Skill';
END
ELSE
BEGIN
  PRINT 'FK constraint FK_TestItems_Skill already exists';
END

-- =====================================================
-- Step 5: Add FK constraint to VtepTestItems table (if exists)
-- =====================================================
IF EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID('dbo.VtepTestItems') AND type = 'U')
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_VtepTestItems_Skill')
  BEGIN
    ALTER TABLE dbo.VtepTestItems
      ADD CONSTRAINT FK_VtepTestItems_Skill
        FOREIGN KEY (Skill)
        REFERENCES dbo.Skills(Id);
    
    PRINT 'Added FK constraint FK_VtepTestItems_Skill';
  END
  ELSE
  BEGIN
    PRINT 'FK constraint FK_VtepTestItems_Skill already exists';
  END
END

-- =====================================================
-- Step 6: Add FK constraint to LearningResources table
-- =====================================================
IF EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID('dbo.LearningResources') AND type = 'U')
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_LearningResources_Skill')
  BEGIN
    ALTER TABLE dbo.LearningResources
      ADD CONSTRAINT FK_LearningResources_Skill
        FOREIGN KEY (Skill)
        REFERENCES dbo.Skills(Id);
    
    PRINT 'Added FK constraint FK_LearningResources_Skill';
  END
  ELSE
  BEGIN
    PRINT 'FK constraint FK_LearningResources_Skill already exists';
  END
END

-- =====================================================
-- Step 7: Add FK constraint to LibraryDocuments table
-- =====================================================
IF EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID('dbo.LibraryDocuments') AND type = 'U')
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_LibraryDocuments_Skill')
  BEGIN
    ALTER TABLE dbo.LibraryDocuments
      ADD CONSTRAINT FK_LibraryDocuments_Skill
        FOREIGN KEY (Skill)
        REFERENCES dbo.Skills(Id);
    
    PRINT 'Added FK constraint FK_LibraryDocuments_Skill';
  END
  ELSE
  BEGIN
    PRINT 'FK constraint FK_LibraryDocuments_Skill already exists';
  END
END

-- =====================================================
-- Step 8: Add FK constraint to VtepTests table (if exists)
-- =====================================================
IF EXISTS (SELECT 1 FROM sys.objects WHERE object_id = OBJECT_ID('dbo.VtepTests') AND type = 'U')
BEGIN
  IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.VtepTests') AND name = 'Skill')
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_VtepTests_Skill')
    BEGIN
      ALTER TABLE dbo.VtepTests
        ADD CONSTRAINT FK_VtepTests_Skill
          FOREIGN KEY (Skill)
          REFERENCES dbo.Skills(Id);
      
      PRINT 'Added FK constraint FK_VtepTests_Skill';
    END
    ELSE
    BEGIN
      PRINT 'FK constraint FK_VtepTests_Skill already exists';
    END
  END
END

COMMIT TRANSACTION;

PRINT '';
PRINT '✅ Migration completed successfully!';
PRINT 'Skills reference table created with standard values:';
PRINT '   - Listening, Speaking, Reading, Writing';
PRINT '   - Pronunciation, vocabulary, Grammar';
PRINT '   - Listening/Reading (combined)';
PRINT '';
PRINT 'Foreign key constraints added to:';
PRINT '   - Tests.Skill';
PRINT '   - TestItems.Skill';
PRINT '   - VtepTestItems.Skill';
PRINT '   - LearningResources.Skill';
PRINT '   - LibraryDocuments.Skill';
PRINT '   - VtepTests.Skill (if column exists)';
PRINT '';
PRINT '⚠️  Important: All new skill values MUST be added to Skills table first';
PRINT '⚠️  Use only Skills.Id values when inserting data';
