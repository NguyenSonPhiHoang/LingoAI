-- Migration: add UserProfiles table and procedures

IF NOT EXISTS (SELECT *
FROM sys.objects
WHERE object_id = OBJECT_ID(N'[dbo].[UserProfiles]') AND type in (N'U'))
BEGIN
  CREATE TABLE dbo.UserProfiles
  (
    UserId NVARCHAR(100) PRIMARY KEY,
    DisplayName NVARCHAR(256) NULL,
    PhotoUrl NVARCHAR(2000) NULL,
    Bio NVARCHAR(MAX) NULL,
    Status NVARCHAR(50) NULL,
    CreatedAt DATETIMEOFFSET NULL,
    UpdatedAt DATETIMEOFFSET NULL
  );

  IF EXISTS (SELECT *
  FROM sys.objects
  WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type in (N'U'))
  BEGIN
    IF NOT EXISTS (
      SELECT *
    FROM sys.foreign_keys
    WHERE parent_object_id = OBJECT_ID(N'[dbo].[UserProfiles]') AND referenced_object_id = OBJECT_ID(N'[dbo].[Users]')
    )
    BEGIN
      ALTER TABLE dbo.UserProfiles ADD CONSTRAINT FK_UserProfiles_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(Id);
    END
  END
END
GO

IF OBJECT_ID('sp_UserProfiles_GetByUserId', 'P') IS NOT NULL DROP PROCEDURE sp_UserProfiles_GetByUserId;
GO
CREATE PROCEDURE sp_UserProfiles_GetByUserId
  @UserId NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT TOP 1
    *
  FROM UserProfiles
  WHERE UserId = @UserId;
END
GO

IF OBJECT_ID('sp_UserProfiles_Upsert', 'P') IS NOT NULL DROP PROCEDURE sp_UserProfiles_Upsert;
GO
CREATE PROCEDURE sp_UserProfiles_Upsert
  @UserId NVARCHAR(100),
  @DisplayName NVARCHAR(256),
  @PhotoUrl NVARCHAR(2000),
  @Bio NVARCHAR(MAX),
  @Status NVARCHAR(50),
  @CreatedAt DATETIMEOFFSET,
  @UpdatedAt DATETIMEOFFSET
AS
BEGIN
  SET NOCOUNT ON;
  MERGE INTO UserProfiles WITH (HOLDLOCK) AS target
  USING (SELECT @UserId AS UserId) AS source
  ON (target.UserId = source.UserId)
  WHEN MATCHED THEN
    UPDATE SET DisplayName = @DisplayName, PhotoUrl = @PhotoUrl, Bio = @Bio, Status = @Status, UpdatedAt = @UpdatedAt
  WHEN NOT MATCHED THEN
    INSERT (UserId, DisplayName, PhotoUrl, Bio, Status, CreatedAt, UpdatedAt)
    VALUES (@UserId, @DisplayName, @PhotoUrl, @Bio, @Status, @CreatedAt, @UpdatedAt);
END
GO
