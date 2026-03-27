-- Quick fix: Create sp_UserSettings_Get
USE Data_LingoAI;
GO

-- Drop if exists
IF OBJECT_ID('dbo.sp_UserSettings_Get', 'P') IS NOT NULL 
    DROP PROCEDURE dbo.sp_UserSettings_Get;
GO

-- Create procedure
CREATE PROCEDURE dbo.sp_UserSettings_Get
  @UserId NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT TOP 1
    UserId, Settings, GeminiApiKey, UpdatedAt
  FROM UserSettings
  WHERE UserId = @UserId;
END
GO

PRINT '✅ sp_UserSettings_Get created successfully!';
