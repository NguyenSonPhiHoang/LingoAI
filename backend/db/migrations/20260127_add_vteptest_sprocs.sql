-- Stored procedures for VtepTests and VtepTestItems
-- VtepTests insert
IF OBJECT_ID('sp_VtepTests_Insert', 'P') IS NOT NULL DROP PROCEDURE sp_VtepTests_Insert;
GO
CREATE PROCEDURE sp_VtepTests_Insert
  @Id NVARCHAR(100),
  @Title NVARCHAR(500) = NULL,
  @Description NVARCHAR(MAX) = NULL,
  @CreatedByUserId NVARCHAR(100) = NULL,
  @IsActive BIT = 0,
  @IsPublic BIT = 0
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO dbo.VtepTests (Id, Title, Description, CreatedByUserId, IsActive, IsPublic, CreatedAt)
  VALUES (@Id, @Title, @Description, @CreatedByUserId, @IsActive, @IsPublic, SYSUTCDATETIME());
END
GO

-- VtepTests update
IF OBJECT_ID('sp_VtepTests_Update', 'P') IS NOT NULL DROP PROCEDURE sp_VtepTests_Update;
GO
CREATE PROCEDURE sp_VtepTests_Update
  @Id NVARCHAR(100),
  @Title NVARCHAR(500) = NULL,
  @Description NVARCHAR(MAX) = NULL,
  @IsActive BIT = NULL,
  @IsPublic BIT = NULL
AS
BEGIN
  SET NOCOUNT ON;
  UPDATE dbo.VtepTests
  SET Title = @Title,
      Description = @Description,
      IsActive = ISNULL(@IsActive, IsActive),
      IsPublic = ISNULL(@IsPublic, IsPublic)
  WHERE Id = @Id;
END
GO

-- VtepTests delete
IF OBJECT_ID('sp_VtepTests_Delete', 'P') IS NOT NULL DROP PROCEDURE sp_VtepTests_Delete;
GO
CREATE PROCEDURE sp_VtepTests_Delete
  @Id NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM dbo.VtepTestItems WHERE VtepTestId = @Id;
  DELETE FROM dbo.VtepTests WHERE Id = @Id;
END
GO

-- VtepTests get by id
IF OBJECT_ID('sp_VtepTests_GetById', 'P') IS NOT NULL DROP PROCEDURE sp_VtepTests_GetById;
GO
CREATE PROCEDURE sp_VtepTests_GetById
  @Id NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT Id, Title, Description, CreatedByUserId, IsActive, IsPublic, CreatedAt FROM dbo.VtepTests WHERE Id = @Id;
END
GO

-- VtepTests list (all)
IF OBJECT_ID('sp_VtepTests_List', 'P') IS NOT NULL DROP PROCEDURE sp_VtepTests_List;
GO
CREATE PROCEDURE sp_VtepTests_List
AS
BEGIN
  SET NOCOUNT ON;
  SELECT Id, Title, Description, CreatedByUserId, IsActive, IsPublic, CreatedAt FROM dbo.VtepTests ORDER BY CreatedAt DESC;
END
GO

-- VtepTests list active & public
IF OBJECT_ID('sp_VtepTests_ListActivePublic', 'P') IS NOT NULL DROP PROCEDURE sp_VtepTests_ListActivePublic;
GO
CREATE PROCEDURE sp_VtepTests_ListActivePublic
AS
BEGIN
  SET NOCOUNT ON;
  SELECT Id, Title, Description, CreatedByUserId, IsActive, IsPublic, CreatedAt FROM dbo.VtepTests WHERE IsActive = 1 AND IsPublic = 1 ORDER BY CreatedAt DESC;
END
GO

-- VtepTestItems insert
IF OBJECT_ID('sp_VtepTestItems_Insert', 'P') IS NOT NULL DROP PROCEDURE sp_VtepTestItems_Insert;
GO
CREATE PROCEDURE sp_VtepTestItems_Insert
  @Id NVARCHAR(100),
  @VtepTestId NVARCHAR(100),
  @Ord INT = NULL,
  @SourceDocumentId NVARCHAR(100) = NULL,
  @Prompt NVARCHAR(MAX) = NULL,
  @OptionsJson NVARCHAR(MAX) = NULL,
  @AnswerJson NVARCHAR(MAX) = NULL,
  @MediaUrl NVARCHAR(MAX) = NULL,
  @Difficulty INT = NULL,
  @CreatedByUserId NVARCHAR(100) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  INSERT INTO dbo.VtepTestItems (Id, VtepTestId, Ord, SourceDocumentId, Prompt, OptionsJson, AnswerJson, MediaUrl, Difficulty, CreatedByUserId, CreatedAt)
  VALUES (@Id, @VtepTestId, @Ord, @SourceDocumentId, @Prompt, @OptionsJson, @AnswerJson, @MediaUrl, @Difficulty, @CreatedByUserId, SYSUTCDATETIME());
END
GO

-- VtepTestItems list by test
IF OBJECT_ID('sp_VtepTestItems_ListByTest', 'P') IS NOT NULL DROP PROCEDURE sp_VtepTestItems_ListByTest;
GO
CREATE PROCEDURE sp_VtepTestItems_ListByTest
  @VtepTestId NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT Id, VtepTestId, Ord, SourceDocumentId, Prompt, OptionsJson, AnswerJson, MediaUrl, Difficulty, CreatedByUserId, CreatedAt
  FROM dbo.VtepTestItems
  WHERE VtepTestId = @VtepTestId
  ORDER BY Ord ASC, CreatedAt ASC;
END
GO

-- VtepTestItems delete by test
IF OBJECT_ID('sp_VtepTestItems_DeleteByTest', 'P') IS NOT NULL DROP PROCEDURE sp_VtepTestItems_DeleteByTest;
GO
CREATE PROCEDURE sp_VtepTestItems_DeleteByTest
  @VtepTestId NVARCHAR(100)
AS
BEGIN
  SET NOCOUNT ON;
  DELETE FROM dbo.VtepTestItems WHERE VtepTestId = @VtepTestId;
END
GO
