-- Add resources JSON column to GrammarLessons
ALTER TABLE dbo.GrammarLessons
ADD ResourcesJson NVARCHAR(MAX) NULL;
