-- Add Status column to Users with default 'pending' and backfill existing rows
IF NOT EXISTS (SELECT *
FROM sys.columns
WHERE Name = N'Status' AND Object_ID = Object_ID(N'[dbo].[Users]'))
BEGIN
  ALTER TABLE dbo.Users ADD Status NVARCHAR(50) NULL CONSTRAINT DF_Users_Status DEFAULT 'pending';
  UPDATE dbo.Users SET Status = 'pending' WHERE Status IS NULL;
END
