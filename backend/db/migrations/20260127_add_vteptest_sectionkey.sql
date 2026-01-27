-- Migration: add SectionKey column to VtepTestItems
IF NOT EXISTS (
  SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[VtepTestItems]') AND name = 'SectionKey'
)
BEGIN
  ALTER TABLE dbo.VtepTestItems ADD SectionKey NVARCHAR(100) NULL;
END
GO
