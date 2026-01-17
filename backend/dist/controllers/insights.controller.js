"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsightsController = void 0;
const db_1 = require("../db");
class InsightsController {
    // GET /api/insights/me?days=30
    static async getMyInsights(req, res) {
        try {
            const userId = req.user?.sub;
            if (!userId)
                return res.status(401).json({ error: "unauthorized" });
            const days = Math.max(1, Math.min(365, Number(req.query.days ?? 30) || 30));
            const pool = await (0, db_1.getPool)();
            // Prefer CompletedAt if present, otherwise CreatedAt.
            const summaryQ = await pool
                .request()
                .input("UserId", userId)
                .input("Days", days)
                .query(`
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
          `);
            const bySkillQ = await pool
                .request()
                .input("UserId", userId)
                .input("Days", days)
                .query(`
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
          `);
            const weakKindsQ = await pool
                .request()
                .input("UserId", userId)
                .input("Days", days)
                .query(`
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
          `);
            const summary = summaryQ.recordset?.[0] || {};
            const bySkill = (bySkillQ.recordset || []).map((r) => {
                const total = Number(r.TotalQuestions || 0);
                const correct = Number(r.CorrectAnswers || 0);
                const accuracy = total > 0 ? correct / total : null;
                return {
                    skill: r.Skill,
                    attempts: Number(r.Attempts || 0),
                    avgScore: r.AvgScore === null || r.AvgScore === undefined
                        ? null
                        : Number(r.AvgScore),
                    accuracy,
                };
            });
            const weakKinds = (weakKindsQ.recordset || []).map((r) => ({
                kind: r.Kind,
                attempts: Number(r.Attempts || 0),
                accuracy: r.Accuracy === null || r.Accuracy === undefined
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
                    avgScore: summary.AvgScore === null || summary.AvgScore === undefined
                        ? null
                        : Number(summary.AvgScore),
                    lastCompletedAt: summary.LastCompletedAt
                        ? new Date(summary.LastCompletedAt).toISOString()
                        : null,
                },
                bySkill,
                weakKinds,
            });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}
exports.InsightsController = InsightsController;
