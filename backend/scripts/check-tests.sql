-- Query 1: Check VtepSpeakingTests templates
SELECT 
  Id,
  Title,
  Level,
  IsActive,
  IsPublic,
  CreatedAt
FROM dbo.VtepSpeakingTests
ORDER BY CreatedAt DESC;

-- Query 2: Check ALL Tests (not just speaking)
SELECT 
  Id,
  UserId,
  Type,
  Skill,
  Score,
  TotalQuestions,
  CorrectAnswers,
  CompletedAt,
  CreatedAt,
  CAST(Data AS NVARCHAR(MAX)) as DataPreview
FROM dbo.Tests
WHERE CreatedAt > DATEADD(hour, -24, GETDATE())
ORDER BY CreatedAt DESC;

-- Query 3: Check Tests with Skill = 'Speaking'
SELECT 
  Id,
  UserId,
  Type,
  Skill,
  Score,
  CompletedAt,
  CreatedAt
FROM dbo.Tests
WHERE Skill = 'Speaking'
ORDER BY CreatedAt DESC;

-- Query 4: Check TestItems
SELECT TOP 20
  ti.Id,
  ti.TestId,
  ti.UserId,
  ti.Skill,
  ti.Kind,
  ti.CreatedAt
FROM dbo.TestItems ti
ORDER BY ti.CreatedAt DESC;

-- Query 5: Count by Type and Skill
SELECT 
  Type,
  Skill,
  COUNT(*) as Count,
  MAX(CreatedAt) as LastCreated
FROM dbo.Tests
GROUP BY Type, Skill
ORDER BY LastCreated DESC;
