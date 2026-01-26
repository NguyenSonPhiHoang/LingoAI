-- Migration: add AllowGemini column to UserSettings and update procs
use Data_LingoAI
go

-- Add column if missing
IF COL_LENGTH('UserSettings', 'AllowGemini') IS NULL
BEGIN
  ALTER TABLE UserSettings ADD AllowGemini BIT NULL;
END
GO

-- Update procedures to include AllowGemini
IF OBJECT_ID('sp_UserSettings_Get', 'P') IS NOT NULL DROP PROCEDURE sp_UserSettings_Get;
GO
CREATE PROCEDURE sp_UserSettings_Get-- 'user_000001'
  @UserId NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT TOP 1
    UserId, Settings, GeminiApiKey, AllowGemini, UpdatedAt
  FROM UserSettings
  WHERE UserId = @UserId;
END
GO

IF OBJECT_ID('sp_UserSettings_Upsert', 'P') IS NOT NULL DROP PROCEDURE sp_UserSettings_Upsert;
GO
CREATE PROCEDURE sp_UserSettings_Upsert
  @UserId NVARCHAR(100),
  @Settings NVARCHAR(MAX),
  @GeminiApiKey NVARCHAR(512),
  @AllowGemini BIT,
  @UpdatedAt DATETIMEOFFSET
AS
BEGIN
  SET NOCOUNT ON;
  MERGE INTO UserSettings WITH (HOLDLOCK) AS target
  USING (SELECT @UserId AS UserId) AS source
  ON (target.UserId = source.UserId)
  WHEN MATCHED THEN
    UPDATE SET Settings = @Settings, GeminiApiKey = @GeminiApiKey, AllowGemini = @AllowGemini, UpdatedAt = @UpdatedAt
  WHEN NOT MATCHED THEN
    INSERT (UserId, Settings, GeminiApiKey, AllowGemini, UpdatedAt) VALUES (@UserId, @Settings, @GeminiApiKey, @AllowGemini, @UpdatedAt);
END
GO
