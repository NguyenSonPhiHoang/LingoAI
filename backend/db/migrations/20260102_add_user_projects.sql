-- Migration: add UserProjects table and procedures

-- Create table if missing
IF NOT EXISTS (SELECT *
FROM sys.objects
WHERE object_id = OBJECT_ID(N'[dbo].[UserProjects]') AND type in (N'U'))
BEGIN
  CREATE TABLE dbo.UserProjects
  (
    Id NVARCHAR(100) PRIMARY KEY,
    UserId NVARCHAR(100) NOT NULL,
    Name NVARCHAR(256) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    Data NVARCHAR(MAX) NULL,
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
    WHERE parent_object_id = OBJECT_ID(N'[dbo].[UserProjects]') AND referenced_object_id = OBJECT_ID(N'[dbo].[Users]')
    )
    BEGIN
      ALTER TABLE dbo.UserProjects ADD CONSTRAINT FK_UserProjects_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(Id);
    END
  END
END
GO

-- Procedures
IF OBJECT_ID('sp_UserProjects_Insert', 'P') IS NOT NULL DROP PROCEDURE sp_UserProjects_Insert;
GO
CREATE PROCEDURE sp_UserProjects_Insert
  @Id NVARCHAR(100),
  @UserId NVARCHAR(100),
  @Name NVARCHAR(256),
  @Description NVARCHAR(MAX),
  @Data NVARCHAR(MAX),
  @CreatedAt DATETIMEOFFSET,
  @UpdatedAt DATETIMEOFFSET
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO UserProjects
    (Id, UserId, Name, Description, Data, CreatedAt, UpdatedAt)
  VALUES
    (@Id, @UserId, @Name, @Description, @Data, @CreatedAt, @UpdatedAt);
END
GO

IF OBJECT_ID('sp_UserProjects_Update', 'P') IS NOT NULL DROP PROCEDURE sp_UserProjects_Update;
GO
CREATE PROCEDURE sp_UserProjects_Update
  @Id NVARCHAR(100),
  @UserId NVARCHAR(100),
  @Name NVARCHAR(256),
  @Description NVARCHAR(MAX),
  @Data NVARCHAR(MAX),
  @UpdatedAt DATETIMEOFFSET
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE UserProjects
  SET Name = @Name,
      Description = @Description,
      Data = @Data,
      UpdatedAt = @UpdatedAt
  WHERE Id = @Id AND UserId = @UserId;
END
GO

IF OBJECT_ID('sp_UserProjects_Delete', 'P') IS NOT NULL DROP PROCEDURE sp_UserProjects_Delete;
GO
CREATE PROCEDURE sp_UserProjects_Delete
  @Id NVARCHAR(100),
  @UserId NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM UserProjects WHERE Id = @Id AND UserId = @UserId;
END
GO

IF OBJECT_ID('sp_UserProjects_GetById', 'P') IS NOT NULL DROP PROCEDURE sp_UserProjects_GetById;
GO
CREATE PROCEDURE sp_UserProjects_GetById
  @Id NVARCHAR(100),
  @UserId NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT TOP 1
    *
  FROM UserProjects
  WHERE Id = @Id AND UserId = @UserId;
END
GO

IF OBJECT_ID('sp_UserProjects_ListByUser', 'P') IS NOT NULL DROP PROCEDURE sp_UserProjects_ListByUser;
GO
CREATE PROCEDURE sp_UserProjects_ListByUser
  @UserId NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT *
  FROM UserProjects
  WHERE UserId = @UserId
  ORDER BY CreatedAt DESC;
END
GO
