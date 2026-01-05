-- Migration: add GeminiApiKey to UserSettings and update procs
use Data_LingoAI
go
-- Add column if missing
IF COL_LENGTH('UserSettings', 'GeminiApiKey') IS NULL
BEGIN
  ALTER TABLE UserSettings ADD GeminiApiKey NVARCHAR(512) NULL;
END
GO

-- Update procedures
IF OBJECT_ID('sp_UserSettings_Get', 'P') IS NOT NULL DROP PROCEDURE sp_UserSettings_Get;
GO
CREATE PROCEDURE sp_UserSettings_Get-- 'user_000001'
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

IF OBJECT_ID('sp_UserSettings_Upsert', 'P') IS NOT NULL DROP PROCEDURE sp_UserSettings_Upsert;
GO
CREATE PROCEDURE sp_UserSettings_Upsert
  @UserId NVARCHAR(100),
  @Settings NVARCHAR(MAX),
  @GeminiApiKey NVARCHAR(512),
  @UpdatedAt DATETIMEOFFSET
AS
BEGIN
  SET NOCOUNT ON;
  MERGE INTO UserSettings WITH (HOLDLOCK) AS target
  USING (SELECT @UserId AS UserId) AS source
  ON (target.UserId = source.UserId)
  WHEN MATCHED THEN
    UPDATE SET Settings = @Settings, GeminiApiKey = @GeminiApiKey, UpdatedAt = @UpdatedAt
  WHEN NOT MATCHED THEN
    INSERT (UserId, Settings, GeminiApiKey, UpdatedAt) VALUES (@UserId, @Settings, @GeminiApiKey, @UpdatedAt);
END
GO
