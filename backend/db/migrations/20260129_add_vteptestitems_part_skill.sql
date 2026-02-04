-- Migration: Add Part and Skill columns to VtepTestItems
-- Date: 2026-01-29

-- Add Part column
IF NOT EXISTS (
  SELECT 1 FROM sys.columns 
  WHERE object_id = OBJECT_ID('dbo.VtepTestItems') 
  AND name = 'Part'
)
BEGIN
  ALTER TABLE dbo.VtepTestItems
  ADD Part NVARCHAR(200) NULL;
  
  PRINT 'Added Part column to VtepTestItems table';
END
ELSE
BEGIN
  PRINT 'Part column already exists in VtepTestItems table';
END
GO

-- Add Skill column
IF NOT EXISTS (
  SELECT 1 FROM sys.columns 
  WHERE object_id = OBJECT_ID('dbo.VtepTestItems') 
  AND name = 'Skill'
)
BEGIN
  ALTER TABLE dbo.VtepTestItems
  ADD Skill NVARCHAR(50) NULL;
  
  PRINT 'Added Skill column to VtepTestItems table';
END
ELSE
BEGIN
  PRINT 'Skill column already exists in VtepTestItems table';
END
GO

PRINT 'Migration completed successfully';
GO
