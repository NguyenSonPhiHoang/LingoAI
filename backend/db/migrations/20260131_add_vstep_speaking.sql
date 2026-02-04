-- Migration: Add VSTEP Speaking Tables
-- Date: 2026-01-31
-- Description: Create tables for VSTEP Speaking test system

-- =====================================================
-- VtepSpeakingPrompts: Store speaking questions/topics
-- =====================================================
IF NOT EXISTS (
  SELECT * FROM sys.objects 
  WHERE object_id = OBJECT_ID(N'[dbo].[VtepSpeakingPrompts]') 
  AND type IN (N'U')
)
BEGIN
  CREATE TABLE dbo.VtepSpeakingPrompts (
    Id NVARCHAR(100) PRIMARY KEY,
    PartNumber INT NOT NULL CHECK (PartNumber IN (1, 2, 3)),
    Category NVARCHAR(100) NULL,
    Level NVARCHAR(10) NULL,
    Title NVARCHAR(500) NOT NULL,
    PromptText NVARCHAR(MAX) NOT NULL,
    
    -- For Part 2 (Long Turn) - Cue Card
    CueCardBullets NVARCHAR(MAX) NULL,  -- JSON: array of "You should say:" points
    PreparationTime INT NULL DEFAULT 60, -- seconds
    SpeakingTime INT NULL DEFAULT 120,   -- seconds
    
    -- Learning resources
    SampleAnswer NVARCHAR(MAX) NULL,
    KeyVocabulary NVARCHAR(MAX) NULL,    -- JSON: array of {word, definition, pronunciation}
    UsefulPhrases NVARCHAR(MAX) NULL,    -- JSON: array of phrases
    
    CreatedByUserId NVARCHAR(100) NULL,
    CreatedAt DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    UpdatedAt DATETIMEOFFSET NULL
  );

  CREATE INDEX IX_VtepSpeakingPrompts_Part_Level 
    ON dbo.VtepSpeakingPrompts(PartNumber, Level);
    
  CREATE INDEX IX_VtepSpeakingPrompts_Category 
    ON dbo.VtepSpeakingPrompts(Category);

  PRINT 'Table VtepSpeakingPrompts created successfully';
END
ELSE
BEGIN
  PRINT 'Table VtepSpeakingPrompts already exists';
END;

-- =====================================================
-- VtepSpeakingTests: Complete speaking tests (3 parts)
-- =====================================================
IF NOT EXISTS (
  SELECT * FROM sys.objects 
  WHERE object_id = OBJECT_ID(N'[dbo].[VtepSpeakingTests]') 
  AND type IN (N'U')
)
BEGIN
  CREATE TABLE dbo.VtepSpeakingTests (
    Id NVARCHAR(100) PRIMARY KEY,
    Title NVARCHAR(500) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    Level NVARCHAR(10) NULL,
    
    -- Part 1: Interview (8-10 questions)
    Part1PromptIds NVARCHAR(MAX) NULL,  -- JSON: array of prompt IDs
    
    -- Part 2: Long Turn (1 cue card)
    Part2PromptId NVARCHAR(100) NULL,
    
    -- Part 3: Discussion (4-6 questions)
    Part3PromptIds NVARCHAR(MAX) NULL,  -- JSON: array of prompt IDs
    
    TotalTimeMinutes INT DEFAULT 15,
    IsActive BIT DEFAULT 0,
    IsPublic BIT DEFAULT 1,
    CreatedByUserId NVARCHAR(100) NULL,
    CreatedAt DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    UpdatedAt DATETIMEOFFSET NULL
  );

  CREATE INDEX IX_VtepSpeakingTests_Active_Public 
    ON dbo.VtepSpeakingTests(IsActive, IsPublic);
    
  CREATE INDEX IX_VtepSpeakingTests_Level 
    ON dbo.VtepSpeakingTests(Level);

  PRINT 'Table VtepSpeakingTests created successfully';
END
ELSE
BEGIN
  PRINT 'Table VtepSpeakingTests already exists';
END;

-- =====================================================
-- VtepSpeakingSubmissions: Student submissions with audio
-- =====================================================
IF NOT EXISTS (
  SELECT * FROM sys.objects 
  WHERE object_id = OBJECT_ID(N'[dbo].[VtepSpeakingSubmissions]') 
  AND type IN (N'U')
)
BEGIN
  CREATE TABLE dbo.VtepSpeakingSubmissions (
    Id NVARCHAR(100) PRIMARY KEY,
    UserId NVARCHAR(100) NOT NULL,
    TestId NVARCHAR(100) NULL,
    PromptId NVARCHAR(100) NULL,
    PartNumber INT NOT NULL CHECK (PartNumber IN (1, 2, 3)),
    
    -- Audio recording
    AudioUrl NVARCHAR(500) NULL,
    DurationSeconds INT NULL,
    
    -- Transcription from speech-to-text
    TranscribedText NVARCHAR(MAX) NULL,
    TranscriptionConfidence DECIMAL(5,2) NULL, -- 0-100%
    
    -- AI Grading (4 criteria)
    AiFeedback NVARCHAR(MAX) NULL,      -- JSON: detailed feedback
    AiScore DECIMAL(5,2) NULL,          -- Overall score 0-10
    ScoreFluency DECIMAL(5,2) NULL,     -- Fluency & Coherence 0-10
    ScoreLexical DECIMAL(5,2) NULL,     -- Lexical Resource 0-10
    ScoreGrammar DECIMAL(5,2) NULL,     -- Grammar 0-10
    ScorePronunciation DECIMAL(5,2) NULL, -- Pronunciation 0-10
    
    -- Manual grading by teacher
    TeacherFeedback NVARCHAR(MAX) NULL,
    TeacherScore DECIMAL(5,2) NULL,
    GradedByUserId NVARCHAR(100) NULL,
    GradedAt DATETIMEOFFSET NULL,
    
    Status NVARCHAR(50) DEFAULT 'submitted', -- 'submitted', 'grading', 'graded', 'reviewed'
    SubmittedAt DATETIMEOFFSET DEFAULT SYSDATETIMEOFFSET(),
    UpdatedAt DATETIMEOFFSET NULL
  );

  CREATE INDEX IX_VtepSpeakingSubmissions_User_Test 
    ON dbo.VtepSpeakingSubmissions(UserId, TestId);
    
  CREATE INDEX IX_VtepSpeakingSubmissions_Status 
    ON dbo.VtepSpeakingSubmissions(Status);
    
  CREATE INDEX IX_VtepSpeakingSubmissions_SubmittedAt 
    ON dbo.VtepSpeakingSubmissions(SubmittedAt DESC);

  PRINT 'Table VtepSpeakingSubmissions created successfully';
END
ELSE
BEGIN
  PRINT 'Table VtepSpeakingSubmissions already exists';
END;

-- =====================================================
-- Sample Data: Insert some initial prompts
-- =====================================================

-- Part 1 Interview Questions
DECLARE @part1Prompts TABLE (
  id NVARCHAR(100),
  title NVARCHAR(500),
  promptText NVARCHAR(MAX),
  category NVARCHAR(100)
);

INSERT INTO @part1Prompts VALUES
('p1-personal-01', 'Hometown', 'Can you tell me about the city or town where you come from?', 'personal'),
('p1-personal-02', 'Work/Study', 'What do you do? Do you work or are you a student?', 'personal'),
('p1-hobbies-01', 'Free Time', 'What do you like to do in your free time?', 'hobbies'),
('p1-hobbies-02', 'Music', 'What kind of music do you enjoy listening to?', 'hobbies'),
('p1-daily-01', 'Daily Routine', 'Can you describe a typical day in your life?', 'daily_life'),
('p1-daily-02', 'Transportation', 'How do you usually travel to work or school?', 'daily_life'),
('p1-family-01', 'Family', 'Tell me about your family. Who do you live with?', 'family'),
('p1-food-01', 'Food', 'What''s your favorite type of food?', 'food'),
('p1-tech-01', 'Technology', 'Do you use social media? Which platforms do you prefer?', 'technology'),
('p1-future-01', 'Plans', 'What are your plans for the future?', 'future');

INSERT INTO dbo.VtepSpeakingPrompts (
  Id, PartNumber, Category, Level, Title, PromptText, 
  CueCardBullets, PreparationTime, SpeakingTime,
  SampleAnswer, KeyVocabulary, UsefulPhrases,
  CreatedAt
)
SELECT 
  id,
  1,
  category,
  'b1',
  title,
  promptText,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  SYSDATETIMEOFFSET()
FROM @part1Prompts
WHERE NOT EXISTS (SELECT 1 FROM dbo.VtepSpeakingPrompts WHERE Id = id);

-- Part 2 Long Turn Topics
DECLARE @part2Prompts TABLE (
  id NVARCHAR(100),
  title NVARCHAR(500),
  promptText NVARCHAR(MAX),
  category NVARCHAR(100),
  bullets NVARCHAR(MAX)
);

INSERT INTO @part2Prompts VALUES
('p2-person-01', 'A Person You Admire', 'Describe a person you admire.', 'description',
 '["Who this person is","How you know them","What they have achieved","Why you admire them"]'),
 
('p2-place-01', 'A Memorable Place', 'Describe a place you visited that was memorable.', 'description',
 '["Where this place is","When you visited it","What you did there","Why it was memorable"]'),
 
('p2-event-01', 'A Special Event', 'Describe a special event or celebration you attended.', 'description',
 '["What the event was","When and where it took place","Who was there","Why it was special to you"]'),
 
('p2-skill-01', 'A Skill You Learned', 'Describe a skill you learned recently.', 'description',
 '["What the skill is","How you learned it","How long it took","Why you wanted to learn it"]'),
 
('p2-experience-01', 'A Memorable Trip', 'Describe a memorable trip you have taken.', 'description',
 '["Where you went","Who you went with","What you did there","Why it was memorable"]');

INSERT INTO dbo.VtepSpeakingPrompts (
  Id, PartNumber, Category, Level, Title, PromptText, 
  CueCardBullets, PreparationTime, SpeakingTime,
  SampleAnswer, KeyVocabulary, UsefulPhrases,
  CreatedAt
)
SELECT 
  id,
  2,
  category,
  'b2',
  title,
  promptText,
  bullets,
  60,
  120,
  NULL,
  NULL,
  NULL,
  SYSDATETIMEOFFSET()
FROM @part2Prompts
WHERE NOT EXISTS (SELECT 1 FROM dbo.VtepSpeakingPrompts WHERE Id = id);

-- Part 3 Discussion Questions
DECLARE @part3Prompts TABLE (
  id NVARCHAR(100),
  title NVARCHAR(500),
  promptText NVARCHAR(MAX),
  category NVARCHAR(100)
);

INSERT INTO @part3Prompts VALUES
('p3-society-01', 'Social Changes', 'How has society changed in your country over the past 20 years?', 'society'),
('p3-tech-01', 'Technology Impact', 'What are the advantages and disadvantages of modern technology?', 'technology'),
('p3-education-01', 'Education Future', 'How do you think education will change in the future?', 'education'),
('p3-environment-01', 'Environmental Issues', 'What can individuals do to protect the environment?', 'environment'),
('p3-work-01', 'Work-Life Balance', 'Is it important to have a good work-life balance? Why?', 'work'),
('p3-travel-01', 'Travel Benefits', 'What are the benefits of traveling to different countries?', 'travel');

INSERT INTO dbo.VtepSpeakingPrompts (
  Id, PartNumber, Category, Level, Title, PromptText, 
  CueCardBullets, PreparationTime, SpeakingTime,
  SampleAnswer, KeyVocabulary, UsefulPhrases,
  CreatedAt
)
SELECT 
  id,
  3,
  category,
  'b2',
  title,
  promptText,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  SYSDATETIMEOFFSET()
FROM @part3Prompts
WHERE NOT EXISTS (SELECT 1 FROM dbo.VtepSpeakingPrompts WHERE Id = id);

PRINT 'Sample prompts inserted successfully';

GO
