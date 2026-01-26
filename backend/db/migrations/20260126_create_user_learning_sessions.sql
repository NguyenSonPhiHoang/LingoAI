-- Migration: create UserLearningSessions table (compatible with existing Users.Id as NVARCHAR)
use Data_LingoAI
go

IF OBJECT_ID('dbo.UserLearningSessions', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.UserLearningSessions (
    SessionID BIGINT IDENTITY(1,1) PRIMARY KEY,
    UserID NVARCHAR(100) NOT NULL,
    LessonID INT NULL,
    StartTime DATETIME2 DEFAULT SYSDATETIME(),
    EndTime DATETIME2 NULL,
    DurationSeconds AS (DATEDIFF(SECOND, StartTime, EndTime)),
    LearningMode NVARCHAR(20) NULL,
    AccuracyRate FLOAT NULL,
    Completed BIT DEFAULT 0,
    IPAddress VARCHAR(45) NULL,

    CONSTRAINT FK_Sessions_Users FOREIGN KEY (UserID) REFERENCES dbo.Users(Id)
  );

  CREATE INDEX IX_Learning_User_Time ON dbo.UserLearningSessions(UserID, StartTime);
END
GO
