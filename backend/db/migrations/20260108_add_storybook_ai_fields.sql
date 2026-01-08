-- Add AI storybook fields to Storybooks and widen StorybookPages.AudioUrl for data URIs

-- Storybooks: level
IF NOT EXISTS (
  SELECT *
FROM sys.columns
WHERE Name = N'Level' AND Object_ID = Object_ID(N'[dbo].[Storybooks]')
)
BEGIN
  ALTER TABLE dbo.Storybooks ADD Level NVARCHAR(50) NULL;
END

-- Storybooks: format
IF NOT EXISTS (
  SELECT *
FROM sys.columns
WHERE Name = N'Format' AND Object_ID = Object_ID(N'[dbo].[Storybooks]')
)
BEGIN
  ALTER TABLE dbo.Storybooks ADD Format NVARCHAR(50) NULL;
END

-- Storybooks: status
IF NOT EXISTS (
  SELECT *
FROM sys.columns
WHERE Name = N'Status' AND Object_ID = Object_ID(N'[dbo].[Storybooks]')
)
BEGIN
  ALTER TABLE dbo.Storybooks ADD Status NVARCHAR(50) NULL;
END

-- Storybooks: key vocabulary (JSON)
IF NOT EXISTS (
  SELECT *
FROM sys.columns
WHERE Name = N'KeyVocabulary' AND Object_ID = Object_ID(N'[dbo].[Storybooks]')
)
BEGIN
  ALTER TABLE dbo.Storybooks ADD KeyVocabulary NVARCHAR(MAX) NULL;
END

-- Storybooks: story content fields
IF NOT EXISTS (
  SELECT *
FROM sys.columns
WHERE Name = N'EnglishStory' AND Object_ID = Object_ID(N'[dbo].[Storybooks]')
)
BEGIN
  ALTER TABLE dbo.Storybooks ADD EnglishStory NVARCHAR(MAX) NULL;
END

IF NOT EXISTS (
  SELECT *
FROM sys.columns
WHERE Name = N'VietnameseStory' AND Object_ID = Object_ID(N'[dbo].[Storybooks]')
)
BEGIN
  ALTER TABLE dbo.Storybooks ADD VietnameseStory NVARCHAR(MAX) NULL;
END

IF NOT EXISTS (
  SELECT *
FROM sys.columns
WHERE Name = N'InterspersedStory' AND Object_ID = Object_ID(N'[dbo].[Storybooks]')
)
BEGIN
  ALTER TABLE dbo.Storybooks ADD InterspersedStory NVARCHAR(MAX) NULL;
END

IF NOT EXISTS (
  SELECT *
FROM sys.columns
WHERE Name = N'FullEnglishStory' AND Object_ID = Object_ID(N'[dbo].[Storybooks]')
)
BEGIN
  ALTER TABLE dbo.Storybooks ADD FullEnglishStory NVARCHAR(MAX) NULL;
END

-- Storybooks: cached audio (data URIs)
IF NOT EXISTS (
  SELECT *
FROM sys.columns
WHERE Name = N'TitleAudioUrl' AND Object_ID = Object_ID(N'[dbo].[Storybooks]')
)
BEGIN
  ALTER TABLE dbo.Storybooks ADD TitleAudioUrl NVARCHAR(MAX) NULL;
END

IF NOT EXISTS (
  SELECT *
FROM sys.columns
WHERE Name = N'EnglishContentAudioUrl' AND Object_ID = Object_ID(N'[dbo].[Storybooks]')
)
BEGIN
  ALTER TABLE dbo.Storybooks ADD EnglishContentAudioUrl NVARCHAR(MAX) NULL;
END

IF NOT EXISTS (
  SELECT *
FROM sys.columns
WHERE Name = N'VietnameseContentAudioUrl' AND Object_ID = Object_ID(N'[dbo].[Storybooks]')
)
BEGIN
  ALTER TABLE dbo.Storybooks ADD VietnameseContentAudioUrl NVARCHAR(MAX) NULL;
END

-- StorybookPages: widen AudioUrl for base64 data URIs
IF EXISTS (
  SELECT *
FROM sys.columns
WHERE Name = N'AudioUrl' AND Object_ID = Object_ID(N'[dbo].[StorybookPages]')
)
BEGIN
  DECLARE @dtype NVARCHAR(128);
  SELECT @dtype = t.name
  FROM sys.columns c
    JOIN sys.types t ON c.user_type_id = t.user_type_id
  WHERE c.object_id = OBJECT_ID(N'[dbo].[StorybookPages]') AND c.name = N'AudioUrl';

  -- If AudioUrl is not MAX, alter to NVARCHAR(MAX)
  IF (@dtype = 'nvarchar')
  BEGIN
    -- This will be safe even if already nvarchar(max)
    ALTER TABLE dbo.StorybookPages ALTER COLUMN AudioUrl NVARCHAR(MAX) NULL;
  END
END
