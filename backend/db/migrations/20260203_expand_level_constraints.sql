-- Migration: Expand level constraints to include A1 and C2
-- Purpose: Allow all 6 CEFR levels (A1, A2, B1, B2, C1, C2) in VTEP tables
-- Date: 2026-02-03

BEGIN TRANSACTION;

-- =====================================================
-- Step 1: Drop existing CHECK constraints
-- =====================================================

-- Drop constraint from VtepWritingPrompts if exists
IF EXISTS (
  SELECT 1 FROM sys.check_constraints 
  WHERE parent_object_id = OBJECT_ID('dbo.VtepWritingPrompts')
  AND name LIKE 'CK__VtepWriti%'
  OR name = 'CK_VtepWritingPrompts_Level'
)
BEGIN
  DECLARE @promptConstraintName NVARCHAR(200);
  SELECT @promptConstraintName = name 
  FROM sys.check_constraints 
  WHERE parent_object_id = OBJECT_ID('dbo.VtepWritingPrompts')
  AND (name LIKE 'CK__VtepWriti%' OR name = 'CK_VtepWritingPrompts_Level');
  
  IF @promptConstraintName IS NOT NULL
  BEGIN
    EXEC('ALTER TABLE dbo.VtepWritingPrompts DROP CONSTRAINT ' + @promptConstraintName);
    PRINT 'Dropped CHECK constraint from VtepWritingPrompts: ' + @promptConstraintName;
  END
END

-- Drop constraint from VtepWritingTests if exists
IF EXISTS (
  SELECT 1 FROM sys.check_constraints 
  WHERE parent_object_id = OBJECT_ID('dbo.VtepWritingTests')
  AND name LIKE 'CK__VtepWriti%'
  OR name = 'CK_VtepWritingTests_Level'
)
BEGIN
  DECLARE @testConstraintName NVARCHAR(200);
  SELECT @testConstraintName = name 
  FROM sys.check_constraints 
  WHERE parent_object_id = OBJECT_ID('dbo.VtepWritingTests')
  AND (name LIKE 'CK__VtepWriti%' OR name = 'CK_VtepWritingTests_Level');
  
  IF @testConstraintName IS NOT NULL
  BEGIN
    EXEC('ALTER TABLE dbo.VtepWritingTests DROP CONSTRAINT ' + @testConstraintName);
    PRINT 'Dropped CHECK constraint from VtepWritingTests: ' + @testConstraintName;
  END
END

-- =====================================================
-- Step 2: Add new CHECK constraints with all 6 levels
-- =====================================================

-- Add constraint to VtepWritingPrompts
IF NOT EXISTS (
  SELECT 1 FROM sys.check_constraints 
  WHERE parent_object_id = OBJECT_ID('dbo.VtepWritingPrompts')
  AND name = 'CK_VtepWritingPrompts_Level_Full'
)
BEGIN
  ALTER TABLE dbo.VtepWritingPrompts
    ADD CONSTRAINT CK_VtepWritingPrompts_Level_Full
    CHECK (Level IN ('a1', 'a2', 'b1', 'b2', 'c1', 'c2') OR Level IS NULL);
  
  PRINT 'Added CHECK constraint CK_VtepWritingPrompts_Level_Full (a1-c2)';
END

-- Add constraint to VtepWritingTests
IF NOT EXISTS (
  SELECT 1 FROM sys.check_constraints 
  WHERE parent_object_id = OBJECT_ID('dbo.VtepWritingTests')
  AND name = 'CK_VtepWritingTests_Level_Full'
)
BEGIN
  ALTER TABLE dbo.VtepWritingTests
    ADD CONSTRAINT CK_VtepWritingTests_Level_Full
    CHECK (Level IN ('a1', 'a2', 'b1', 'b2', 'c1', 'c2') OR Level IS NULL);
  
  PRINT 'Added CHECK constraint CK_VtepWritingTests_Level_Full (a1-c2)';
END

COMMIT TRANSACTION;

PRINT '';
PRINT '✅ Migration completed successfully!';
PRINT 'Level constraints updated to accept all 6 CEFR levels:';
PRINT '   - A1 (Beginner)';
PRINT '   - A2 (Elementary)';
PRINT '   - B1 (Intermediate)';
PRINT '   - B2 (Upper-Intermediate)';
PRINT '   - C1 (Advanced)';
PRINT '   - C2 (Proficiency)';
PRINT '';
PRINT 'Tables updated:';
PRINT '   - VtepWritingPrompts.Level';
PRINT '   - VtepWritingTests.Level';
