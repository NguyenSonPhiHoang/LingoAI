-- Delete all Writing test items first (foreign key constraint)
DELETE FROM TestItems
WHERE testId IN (
    SELECT id FROM Tests 
    WHERE type = 'vtep' 
    AND data LIKE '%"skill":"Writing"%'
);

-- Delete all Writing tests
DELETE FROM Tests
WHERE type = 'vtep' 
AND data LIKE '%"skill":"Writing"%';

-- Show remaining tests
SELECT 
    id,
    type,
    userId,
    score,
    createdAt,
    CAST(data AS NVARCHAR(MAX)) as data
FROM Tests
WHERE type = 'vtep'
ORDER BY createdAt DESC;
