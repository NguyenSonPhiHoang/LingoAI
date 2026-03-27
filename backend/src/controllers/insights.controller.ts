import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { getPool } from "../db";

export class InsightsController {
  // GET /api/insights/me?days=30
  static async getMyInsights(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) return res.status(401).json({ error: "unauthorized" });

      const days = Math.max(
        1,
        Math.min(365, Number(req.query.days ?? 30) || 30)
      );

      const pool = await getPool();

      // Prefer CompletedAt if present, otherwise CreatedAt.
      const summaryQ = await pool
        .request()
        .input("UserId", userId)
        .input("Days", days)
        .query(
          `
          DECLARE @Since DATETIMEOFFSET = DATEADD(day, -@Days, SYSDATETIMEOFFSET());

          SELECT
            COUNT(1) AS Attempts,
            SUM(CASE WHEN Type = 'practice' THEN 1 ELSE 0 END) AS PracticeAttempts,
            SUM(CASE WHEN Type = 'placement' THEN 1 ELSE 0 END) AS PlacementAttempts,
            SUM(CASE WHEN Type = 'review' THEN 1 ELSE 0 END) AS ReviewAttempts,
            AVG(CASE WHEN Score IS NULL THEN NULL ELSE Score END) AS AvgScore,
            MAX(COALESCE(CompletedAt, CreatedAt)) AS LastCompletedAt
          FROM dbo.Tests
          WHERE UserId = @UserId
            AND COALESCE(CompletedAt, CreatedAt) >= @Since;
          `
        );

      const bySkillQ = await pool
        .request()
        .input("UserId", userId)
        .input("Days", days)
        .query(
          `
          DECLARE @Since DATETIMEOFFSET = DATEADD(day, -@Days, SYSDATETIMEOFFSET());

          SELECT
            Skill,
            COUNT(1) AS Attempts,
            AVG(CASE WHEN Score IS NULL THEN NULL ELSE Score END) AS AvgScore,
            SUM(CASE WHEN TotalQuestions IS NULL OR TotalQuestions = 0 THEN 0 ELSE TotalQuestions END) AS TotalQuestions,
            SUM(CASE WHEN CorrectAnswers IS NULL THEN 0 ELSE CorrectAnswers END) AS CorrectAnswers
          FROM dbo.Tests
          WHERE UserId = @UserId
            AND COALESCE(CompletedAt, CreatedAt) >= @Since
            AND Skill IS NOT NULL
          GROUP BY Skill
          ORDER BY Attempts DESC;
          `
        );

      const weakKindsQ = await pool
        .request()
        .input("UserId", userId)
        .input("Days", days)
        .query(
          `
          DECLARE @Since DATETIMEOFFSET = DATEADD(day, -@Days, SYSDATETIMEOFFSET());

          SELECT TOP 8
            Kind,
            COUNT(1) AS Attempts,
            AVG(CASE WHEN IsCorrect IS NULL THEN NULL WHEN IsCorrect = 1 THEN 1.0 ELSE 0.0 END) AS Accuracy
          FROM dbo.TestItems
          WHERE UserId = @UserId
            AND CreatedAt >= @Since
            AND Kind IS NOT NULL
          GROUP BY Kind
          HAVING COUNT(1) >= 5
          ORDER BY Accuracy ASC, Attempts DESC;
          `
        );

      const summary = summaryQ.recordset?.[0] || {};

      const bySkill = (bySkillQ.recordset || []).map((r: any) => {
        const total = Number(r.TotalQuestions || 0);
        const correct = Number(r.CorrectAnswers || 0);
        const accuracy = total > 0 ? correct / total : null;
        return {
          skill: r.Skill,
          attempts: Number(r.Attempts || 0),
          avgScore:
            r.AvgScore === null || r.AvgScore === undefined
              ? null
              : Number(r.AvgScore),
          accuracy,
        };
      });

      const weakKinds = (weakKindsQ.recordset || []).map((r: any) => ({
        kind: r.Kind,
        attempts: Number(r.Attempts || 0),
        accuracy:
          r.Accuracy === null || r.Accuracy === undefined
            ? null
            : Number(r.Accuracy),
      }));

      res.json({
        windowDays: days,
        summary: {
          attempts: Number(summary.Attempts || 0),
          practiceAttempts: Number(summary.PracticeAttempts || 0),
          placementAttempts: Number(summary.PlacementAttempts || 0),
          reviewAttempts: Number(summary.ReviewAttempts || 0),
          avgScore:
            summary.AvgScore === null || summary.AvgScore === undefined
              ? null
              : Number(summary.AvgScore),
          lastCompletedAt: summary.LastCompletedAt
            ? new Date(summary.LastCompletedAt).toISOString()
            : null,
        },
        bySkill,
        weakKinds,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // GET /api/insights/admin/overview  (admin only)
  static async getAdminOverview(req: AuthRequest, res: Response) {
    try {
      const pool = await getPool();

      // 1. User stats
      const userStatsQ = await pool.request().query(`
        SELECT
          COUNT(1) AS Total,
          SUM(CASE WHEN Status='approved'     THEN 1 ELSE 0 END) AS Approved,
          SUM(CASE WHEN Status='pending'      THEN 1 ELSE 0 END) AS Pending,
          SUM(CASE WHEN Status='rejected'     THEN 1 ELSE 0 END) AS Rejected,
          SUM(CASE WHEN RoleId='role_student' THEN 1 ELSE 0 END) AS Students,
          SUM(CASE WHEN RoleId='role_teacher' THEN 1 ELSE 0 END) AS Teachers,
          SUM(CASE WHEN RoleId='role_admin'   THEN 1 ELSE 0 END) AS Admins
        FROM dbo.Users;
      `);

      // 2. Registrations last 30 days
      const regByDayQ = await pool.request().query(`
        SELECT CAST(CreatedAt AS DATE) AS RegDate, COUNT(1) AS Cnt
        FROM dbo.Users
        WHERE CreatedAt >= DATEADD(day, -30, SYSDATETIMEOFFSET())
        GROUP BY CAST(CreatedAt AS DATE)
        ORDER BY RegDate;
      `);

      // 3. Overall test stats
      const testStatsQ = await pool.request().query(`
        SELECT
          COUNT(1) AS TotalAttempts,
          AVG(CASE WHEN Score IS NULL THEN NULL ELSE Score END) AS AvgScore,
          AVG(CASE WHEN DurationSeconds IS NULL THEN NULL ELSE CAST(DurationSeconds AS FLOAT) END) AS AvgDuration
        FROM dbo.Tests WHERE UserId IS NOT NULL;
      `);

      // 4. Test perf by skill
      const bySkillQ = await pool.request().query(`
        SELECT Skill, COUNT(1) AS Attempts,
          AVG(CASE WHEN Score IS NULL THEN NULL ELSE Score END) AS AvgScore,
          SUM(CASE WHEN TotalQuestions IS NULL OR TotalQuestions=0 THEN 0 ELSE TotalQuestions END) AS TotalQ,
          SUM(CASE WHEN CorrectAnswers IS NULL THEN 0 ELSE CorrectAnswers END) AS CorrectA
        FROM dbo.Tests WHERE Skill IS NOT NULL AND UserId IS NOT NULL
        GROUP BY Skill ORDER BY Attempts DESC;
      `);

      // 5. Session stats
      const sessionQ = await pool.request().query(`
        SELECT COUNT(1) AS TotalSessions,
          AVG(CASE WHEN EndTime IS NULL OR StartTime IS NULL THEN NULL
              ELSE DATEDIFF(second, StartTime, EndTime)/60.0 END) AS AvgDurationMin,
          AVG(CASE WHEN Completed=1 THEN 1.0 ELSE 0.0 END) AS CompletionRate
        FROM dbo.UserLearningSession;
      `).catch(() => ({ recordset: [{}] }));

      // 6. Top 10 active users
      const topUsersQ = await pool.request().query(`
        SELECT TOP 10 t.UserId, u.DisplayName, u.Email,
          COUNT(1) AS Attempts,
          AVG(CASE WHEN t.Score IS NULL THEN NULL ELSE t.Score END) AS AvgScore,
          MAX(t.CreatedAt) AS LastActive
        FROM dbo.Tests t JOIN dbo.Users u ON u.Id = t.UserId
        WHERE t.UserId IS NOT NULL
        GROUP BY t.UserId, u.DisplayName, u.Email ORDER BY Attempts DESC;
      `);

      // 7. Active last 7 days
      const activeRecentQ = await pool.request().query(`
        SELECT COUNT(DISTINCT UserId) AS ActiveUsers FROM dbo.Tests
        WHERE UserId IS NOT NULL AND CreatedAt >= DATEADD(day,-7,SYSDATETIMEOFFSET());
      `).catch(() => ({ recordset: [{ ActiveUsers: 0 }] }));

      const us = userStatsQ.recordset?.[0] || {};
      const ts = testStatsQ.recordset?.[0] || {};
      const ss = sessionQ.recordset?.[0] || {};

      res.json({
        userStats: {
          total:    Number(us.Total    || 0),
          approved: Number(us.Approved || 0),
          pending:  Number(us.Pending  || 0),
          rejected: Number(us.Rejected || 0),
          students: Number(us.Students || 0),
          teachers: Number(us.Teachers || 0),
          admins:   Number(us.Admins   || 0),
          activeLastWeek: Number(activeRecentQ.recordset?.[0]?.ActiveUsers || 0),
        },
        registrationsByDay: (regByDayQ.recordset || []).map((r: any) => ({
          date:  r.RegDate ? new Date(r.RegDate).toISOString().split("T")[0] : "",
          count: Number(r.Cnt || 0),
        })),
        testStats: {
          totalAttempts:  Number(ts.TotalAttempts || 0),
          avgScore:       ts.AvgScore   != null ? Math.round(Number(ts.AvgScore) * 10) / 10 : null,
          avgDurationMin: ts.AvgDuration != null ? Math.round(Number(ts.AvgDuration) / 60 * 10) / 10 : null,
        },
        testsBySkill: (bySkillQ.recordset || []).map((r: any) => {
          const tq = Number(r.TotalQ || 0);
          const ca = Number(r.CorrectA || 0);
          return {
            skill:    r.Skill,
            attempts: Number(r.Attempts || 0),
            avgScore: r.AvgScore != null ? Math.round(Number(r.AvgScore) * 10) / 10 : null,
            accuracy: tq > 0 ? Math.round((ca / tq) * 1000) / 10 : null,
          };
        }),
        sessionStats: {
          totalSessions:  Number(ss.TotalSessions  || 0),
          avgDurationMin: ss.AvgDurationMin != null ? Math.round(Number(ss.AvgDurationMin) * 10) / 10 : null,
          completionRate: ss.CompletionRate  != null ? Math.round(Number(ss.CompletionRate) * 1000) / 10 : null,
        },
        topActiveUsers: (topUsersQ.recordset || []).map((r: any) => ({
          userId:      r.UserId,
          displayName: r.DisplayName || r.Email || r.UserId,
          email:       r.Email,
          attempts:    Number(r.Attempts || 0),
          avgScore:    r.AvgScore != null ? Math.round(Number(r.AvgScore) * 10) / 10 : null,
          lastActive:  r.LastActive ? new Date(r.LastActive).toISOString() : null,
        })),
      });
    } catch (err: any) {
      console.error("Admin overview error:", err);
      res.status(500).json({ error: err.message });
    }
  }
}
