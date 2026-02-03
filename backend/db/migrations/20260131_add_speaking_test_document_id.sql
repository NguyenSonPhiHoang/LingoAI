-- Add DocumentId to VtepSpeakingTests to link tests with documents
IF NOT EXISTS (
  SELECT * FROM sys.columns 
  WHERE object_id = OBJECT_ID(N'[dbo].[VtepSpeakingTests]') 
  AND name = 'DocumentId'
)
BEGIN
  ALTER TABLE dbo.VtepSpeakingTests
  ADD DocumentId NVARCHAR(100) NULL;
  
  CREATE INDEX IX_VtepSpeakingTests_DocumentId 
    ON dbo.VtepSpeakingTests(DocumentId);
  
  PRINT 'Column DocumentId added to VtepSpeakingTests';
END
ELSE
BEGIN
  PRINT 'Column DocumentId already exists in VtepSpeakingTests';
END;
GO

-- Update existing tests to link with first Speaking document (if any)
DECLARE @firstSpeakingDocId NVARCHAR(100);

SELECT TOP 1 @firstSpeakingDocId = Id
FROM dbo.VtepDocuments
WHERE TocJson LIKE '%"skill"%"Speaking"%'
   OR TocJson LIKE '%speaking%'
ORDER BY CreatedAt DESC;

IF @firstSpeakingDocId IS NOT NULL
BEGIN
  UPDATE dbo.VtepSpeakingTests
  SET DocumentId = @firstSpeakingDocId
  WHERE DocumentId IS NULL;
  
  PRINT 'Updated existing Speaking tests with DocumentId: ' + @firstSpeakingDocId;
END
ELSE
BEGIN
  PRINT 'No Speaking document found to link tests';
END;
