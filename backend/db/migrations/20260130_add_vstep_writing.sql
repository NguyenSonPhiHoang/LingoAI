-- Migration: Add VSTEP Writing tables
-- Date: 2026-01-30
-- Description: Add tables for VSTEP Writing test management (prompts, tests, submissions)

-- =============================================
-- VtepWritingPrompts: Store writing prompts (Task 1 and Task 2)
-- =============================================
IF NOT EXISTS (
  SELECT * FROM sys.objects 
  WHERE object_id = OBJECT_ID(N'[dbo].[VtepWritingPrompts]') 
  AND type IN (N'U')
)
BEGIN
  PRINT 'Creating table VtepWritingPrompts...';
  
  CREATE TABLE dbo.VtepWritingPrompts (
    Id NVARCHAR(100) NOT NULL PRIMARY KEY,
    TaskType NVARCHAR(20) NOT NULL CHECK (TaskType IN ('task1', 'task2')),
    Category NVARCHAR(100) NULL,
    Level NVARCHAR(10) NULL CHECK (Level IN ('a2', 'b1', 'b2', 'c1', NULL)),
    Title NVARCHAR(500) NOT NULL,
    PromptText NVARCHAR(MAX) NOT NULL,
    SampleAnswer NVARCHAR(MAX) NULL,
    KeyPoints NVARCHAR(MAX) NULL,      -- JSON array
    SuggestedVocab NVARCHAR(MAX) NULL, -- JSON array
    TimeLimit INT NULL DEFAULT 20,      -- minutes
    MinWords INT NULL DEFAULT 120,
    CreatedByUserId NVARCHAR(100) NULL,
    CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    UpdatedAt DATETIMEOFFSET NULL
  );

  -- Indexes
  CREATE INDEX IX_VtepWritingPrompts_TaskType_Level 
    ON dbo.VtepWritingPrompts(TaskType, Level)
    INCLUDE (Title, Category, CreatedAt);
    
  CREATE INDEX IX_VtepWritingPrompts_Category 
    ON dbo.VtepWritingPrompts(Category)
    WHERE Category IS NOT NULL;

  PRINT 'Table VtepWritingPrompts created successfully.';
END
ELSE
BEGIN
  PRINT 'Table VtepWritingPrompts already exists.';
END
GO

-- =============================================
-- VtepWritingTests: Full writing test (Task 1 + Task 2)
-- =============================================
IF NOT EXISTS (
  SELECT * FROM sys.objects 
  WHERE object_id = OBJECT_ID(N'[dbo].[VtepWritingTests]') 
  AND type IN (N'U')
)
BEGIN
  PRINT 'Creating table VtepWritingTests...';
  
  CREATE TABLE dbo.VtepWritingTests (
    Id NVARCHAR(100) NOT NULL PRIMARY KEY,
    Title NVARCHAR(500) NOT NULL,
    Description NVARCHAR(MAX) NULL,
    Level NVARCHAR(10) NULL CHECK (Level IN ('a2', 'b1', 'b2', 'c1', NULL)),
    Task1PromptId NVARCHAR(100) NULL,
    Task2PromptId NVARCHAR(100) NULL,
    TotalTimeMinutes INT NOT NULL DEFAULT 60,
    IsActive BIT NOT NULL DEFAULT 0,
    IsPublic BIT NOT NULL DEFAULT 1,
    CreatedByUserId NVARCHAR(100) NULL,
    CreatedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    UpdatedAt DATETIMEOFFSET NULL
  );
  
  -- Add foreign keys
  ALTER TABLE dbo.VtepWritingTests
    ADD CONSTRAINT FK_VtepWritingTests_Task1Prompt 
      FOREIGN KEY (Task1PromptId) 
      REFERENCES dbo.VtepWritingPrompts(Id);
      
  ALTER TABLE dbo.VtepWritingTests
    ADD CONSTRAINT FK_VtepWritingTests_Task2Prompt 
      FOREIGN KEY (Task2PromptId) 
      REFERENCES dbo.VtepWritingPrompts(Id);

  -- Indexes
  CREATE INDEX IX_VtepWritingTests_Level_IsActive 
    ON dbo.VtepWritingTests(Level, IsActive, IsPublic)
    INCLUDE (Title, CreatedAt);
    
  CREATE INDEX IX_VtepWritingTests_CreatedBy 
    ON dbo.VtepWritingTests(CreatedByUserId)
    WHERE CreatedByUserId IS NOT NULL;

  PRINT 'Table VtepWritingTests created successfully.';
END
ELSE
BEGIN
  PRINT 'Table VtepWritingTests already exists.';
END
GO

-- =============================================
-- VtepWritingSubmissions: Student submissions with AI and teacher grading
-- =============================================
IF NOT EXISTS (
  SELECT * FROM sys.objects 
  WHERE object_id = OBJECT_ID(N'[dbo].[VtepWritingSubmissions]') 
  AND type IN (N'U')
)
BEGIN
  PRINT 'Creating table VtepWritingSubmissions...';
  
  CREATE TABLE dbo.VtepWritingSubmissions (
    Id NVARCHAR(100) NOT NULL PRIMARY KEY,
    UserId NVARCHAR(100) NOT NULL,
    TestId NVARCHAR(100) NULL,
    PromptId NVARCHAR(100) NULL,
    TaskType NVARCHAR(20) NOT NULL CHECK (TaskType IN ('task1', 'task2')),
    SubmittedText NVARCHAR(MAX) NOT NULL,
    WordCount INT NULL,
    TimeSpentSeconds INT NULL,
    
    -- AI Grading
    AiFeedback NVARCHAR(MAX) NULL,        -- JSON object
    AiScore FLOAT NULL,                    -- Overall score 0-10
    ScoreTaskAchievement FLOAT NULL,       -- 0-10
    ScoreCoherence FLOAT NULL,             -- 0-10
    ScoreLexical FLOAT NULL,               -- 0-10
    ScoreGrammar FLOAT NULL,               -- 0-10
    
    -- Teacher Grading (optional)
    TeacherFeedback NVARCHAR(MAX) NULL,
    TeacherScore FLOAT NULL,
    GradedByUserId NVARCHAR(100) NULL,
    GradedAt DATETIMEOFFSET NULL,
    
    -- Status
    Status NVARCHAR(20) NOT NULL DEFAULT 'submitted' 
      CHECK (Status IN ('draft', 'submitted', 'graded', 'reviewed')),
    
    SubmittedAt DATETIMEOFFSET NOT NULL DEFAULT SYSDATETIMEOFFSET(),
    UpdatedAt DATETIMEOFFSET NULL
  );
  
  -- Add foreign keys
  ALTER TABLE dbo.VtepWritingSubmissions
    ADD CONSTRAINT FK_VtepWritingSubmissions_User 
      FOREIGN KEY (UserId) 
      REFERENCES dbo.Users(Id);
      
  ALTER TABLE dbo.VtepWritingSubmissions
    ADD CONSTRAINT FK_VtepWritingSubmissions_Test 
      FOREIGN KEY (TestId) 
      REFERENCES dbo.VtepWritingTests(Id);
      
  ALTER TABLE dbo.VtepWritingSubmissions
    ADD CONSTRAINT FK_VtepWritingSubmissions_Prompt 
      FOREIGN KEY (PromptId) 
      REFERENCES dbo.VtepWritingPrompts(Id);
      
  ALTER TABLE dbo.VtepWritingSubmissions
    ADD CONSTRAINT FK_VtepWritingSubmissions_GradedBy 
      FOREIGN KEY (GradedByUserId) 
      REFERENCES dbo.Users(Id);

  -- Indexes for common queries
  CREATE INDEX IX_VtepWritingSubmissions_User_Submitted 
    ON dbo.VtepWritingSubmissions(UserId, SubmittedAt DESC)
    INCLUDE (TestId, PromptId, TaskType, Status, AiScore, TeacherScore);
    
  CREATE INDEX IX_VtepWritingSubmissions_Test 
    ON dbo.VtepWritingSubmissions(TestId)
    WHERE TestId IS NOT NULL;
    
  CREATE INDEX IX_VtepWritingSubmissions_Prompt 
    ON dbo.VtepWritingSubmissions(PromptId)
    WHERE PromptId IS NOT NULL;
    
  CREATE INDEX IX_VtepWritingSubmissions_Status 
    ON dbo.VtepWritingSubmissions(Status, SubmittedAt DESC)
    INCLUDE (UserId, TaskType);
    
  CREATE INDEX IX_VtepWritingSubmissions_GradedBy 
    ON dbo.VtepWritingSubmissions(GradedByUserId, GradedAt DESC)
    WHERE GradedByUserId IS NOT NULL;

  PRINT 'Table VtepWritingSubmissions created successfully.';
END
ELSE
BEGIN
  PRINT 'Table VtepWritingSubmissions already exists.';
END
GO

-- =============================================
-- Sample Data: Insert some example prompts
-- =============================================
IF NOT EXISTS (SELECT 1 FROM dbo.VtepWritingPrompts)
BEGIN
  PRINT 'Inserting sample writing prompts...';
  
  -- Task 1 Examples
  INSERT INTO dbo.VtepWritingPrompts (
    Id, TaskType, Category, Level, Title, PromptText, TimeLimit, MinWords
  ) VALUES 
  (
    NEWID(),
    'task1',
    'complaint_letter',
    'b1',
    'Complaint about hotel service',
    'You recently stayed at a hotel and had a very unpleasant experience. Write a letter to the hotel manager to complain about:

• The condition of your room
• The quality of the food
• The attitude of the staff

Write at least 120 words.',
    20,
    120
  ),
  (
    NEWID(),
    'task1',
    'request_information',
    'b2',
    'Request information about English course',
    'You are planning to study English abroad. Write an email to the language school to ask about:

• Course details and levels available
• Accommodation options
• Costs and payment methods

Write at least 120 words.',
    20,
    120
  ),
  (
    NEWID(),
    'task1',
    'invitation_letter',
    'b1',
    'Invitation to friend',
    'You are organizing a birthday party for yourself. Write a letter to invite your friend. Include:

• When and where the party will be held
• What activities you have planned
• What they should bring or prepare

Write at least 120 words.',
    20,
    120
  );
  
  -- Task 2 Examples
  INSERT INTO dbo.VtepWritingPrompts (
    Id, TaskType, Category, Level, Title, PromptText, TimeLimit, MinWords
  ) VALUES 
  (
    NEWID(),
    'task2',
    'opinion',
    'b2',
    'Online learning vs Traditional learning',
    'Some people believe that online learning is more effective than traditional classroom learning, while others disagree.

Discuss both views and give your own opinion.

Give reasons for your answer and include any relevant examples from your own knowledge or experience.

Write at least 250 words.',
    40,
    250
  ),
  (
    NEWID(),
    'task2',
    'advantages_disadvantages',
    'b2',
    'Living in big cities',
    'More and more people are moving from rural areas to big cities.

What are the advantages and disadvantages of this trend?

Give reasons for your answer and include any relevant examples from your own knowledge or experience.

Write at least 250 words.',
    40,
    250
  ),
  (
    NEWID(),
    'task2',
    'problem_solution',
    'c1',
    'Environmental pollution',
    'Environmental pollution is becoming an increasingly serious problem in many parts of the world.

What are the causes of this problem and what measures can be taken to address it?

Give reasons for your answer and include any relevant examples from your own knowledge or experience.

Write at least 250 words.',
    40,
    250
  );
  
  PRINT 'Sample writing prompts inserted successfully.';
END
ELSE
BEGIN
  PRINT 'Sample data already exists, skipping insertion.';
END
GO

PRINT 'Migration 20260130_add_vstep_writing completed successfully!';
GO
