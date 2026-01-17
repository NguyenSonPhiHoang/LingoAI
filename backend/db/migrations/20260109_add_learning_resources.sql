-- Add system learning resources managed by admins (CEFR levels a1-c2)

IF NOT EXISTS (
  SELECT 1
  FROM sys.objects
  WHERE object_id = OBJECT_ID(N'[dbo].[LearningResources]') AND type IN (N'U')
)
BEGIN
  CREATE TABLE dbo.LearningResources
  (
    Id NVARCHAR(100) PRIMARY KEY,
    Level NVARCHAR(10) NOT NULL,
    Skill NVARCHAR(50) NOT NULL,
    Label NVARCHAR(500) NOT NULL,
    Url NVARCHAR(2048) NOT NULL,
    CreatedByUserId NVARCHAR(100) NULL,
    CreatedAt DATETIMEOFFSET NULL,
    UpdatedAt DATETIMEOFFSET NULL
  );

  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_LearningResources_Level_Skill_CreatedAt' AND object_id = OBJECT_ID('dbo.LearningResources')
  )
  BEGIN
    CREATE INDEX IX_LearningResources_Level_Skill_CreatedAt
      ON dbo.LearningResources(Level, Skill, CreatedAt)
      INCLUDE (Label, Url);
  END

  -- Optional dedupe per level+skill+url
  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UX_LearningResources_Level_Skill_Url' AND object_id = OBJECT_ID('dbo.LearningResources')
  )
  BEGIN
    CREATE UNIQUE INDEX UX_LearningResources_Level_Skill_Url
      ON dbo.LearningResources(Level, Skill, Url);
  END

  -- Optional FK to Users
  IF EXISTS (
    SELECT 1
    FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type IN (N'U')
  )
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM sys.foreign_keys
      WHERE name = 'FK_LearningResources_Users'
    )
    BEGIN
      ALTER TABLE dbo.LearningResources
        ADD CONSTRAINT FK_LearningResources_Users
        FOREIGN KEY (CreatedByUserId) REFERENCES dbo.Users(Id);
    END
  END
END

IF NOT EXISTS (
  SELECT 1
  FROM sys.objects
  WHERE object_id = OBJECT_ID(N'[dbo].[LearningResourceRatings]') AND type IN (N'U')
)
BEGIN
  CREATE TABLE dbo.LearningResourceRatings
  (
    ResourceId NVARCHAR(100) NOT NULL,
    UserId NVARCHAR(100) NOT NULL,
    Rating INT NOT NULL,
    CreatedAt DATETIMEOFFSET NULL,
    UpdatedAt DATETIMEOFFSET NULL,
    CONSTRAINT PK_LearningResourceRatings PRIMARY KEY (ResourceId, UserId)
  );

  IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_LearningResourceRatings_Resource' AND object_id = OBJECT_ID('dbo.LearningResourceRatings')
  )
  BEGIN
    CREATE INDEX IX_LearningResourceRatings_Resource
      ON dbo.LearningResourceRatings(ResourceId)
      INCLUDE (Rating, UpdatedAt);
  END

  -- FK to LearningResources
  IF EXISTS (
    SELECT 1
    FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[LearningResources]') AND type IN (N'U')
  )
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM sys.foreign_keys
      WHERE name = 'FK_LearningResourceRatings_Resources'
    )
    BEGIN
      ALTER TABLE dbo.LearningResourceRatings
        ADD CONSTRAINT FK_LearningResourceRatings_Resources
        FOREIGN KEY (ResourceId) REFERENCES dbo.LearningResources(Id);
    END
  END

  -- Optional FK to Users
  IF EXISTS (
    SELECT 1
    FROM sys.objects
    WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type IN (N'U')
  )
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM sys.foreign_keys
      WHERE name = 'FK_LearningResourceRatings_Users'
    )
    BEGIN
      ALTER TABLE dbo.LearningResourceRatings
        ADD CONSTRAINT FK_LearningResourceRatings_Users
        FOREIGN KEY (UserId) REFERENCES dbo.Users(Id);
    END
  END
END
