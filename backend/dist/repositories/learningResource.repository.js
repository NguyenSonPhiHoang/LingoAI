"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LearningResourceRepository = void 0;
const db_1 = require("../db");
function toIso(val) {
    if (!val)
        return null;
    const d = val instanceof Date ? val : new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString();
}
class LearningResourceRepository {
    static async listAllForUser(userId) {
        const pool = await (0, db_1.getPool)();
        const res = await pool
            .request()
            .input("UserId", userId)
            .query(`SELECT r.Id, r.Level, r.Skill, r.Label, r.Url, r.CreatedAt,
                ISNULL(agg.RatingCount, 0) AS RatingCount,
                ISNULL(agg.AverageRating, 0) AS AverageRating,
                ur.Rating AS UserRating
         FROM dbo.LearningResources r
         OUTER APPLY (
           SELECT COUNT(1) AS RatingCount,
                  AVG(CAST(rr.Rating AS FLOAT)) AS AverageRating
           FROM dbo.LearningResourceRatings rr
           WHERE rr.ResourceId = r.Id
         ) agg
         LEFT JOIN dbo.LearningResourceRatings ur
           ON ur.ResourceId = r.Id AND ur.UserId = @UserId
         ORDER BY r.Level ASC, r.Skill ASC, r.CreatedAt ASC`);
        return (res.recordset || []).map((row) => ({
            id: row.Id,
            level: row.Level,
            skill: row.Skill,
            label: row.Label,
            url: row.Url,
            createdAt: toIso(row.CreatedAt),
            ratingCount: Number(row.RatingCount || 0),
            averageRating: Number(row.AverageRating || 0),
            userRating: row.UserRating === null || row.UserRating === undefined
                ? null
                : Number(row.UserRating),
        }));
    }
    static async create(input) {
        const pool = await (0, db_1.getPool)();
        const now = new Date();
        await pool
            .request()
            .input("Id", input.id)
            .input("Level", input.level)
            .input("Skill", input.skill)
            .input("Label", input.label)
            .input("Url", input.url)
            .input("CreatedByUserId", input.createdByUserId ?? null)
            .input("CreatedAt", now)
            .input("UpdatedAt", now)
            .query(`INSERT INTO dbo.LearningResources (Id, Level, Skill, Label, Url, CreatedByUserId, CreatedAt, UpdatedAt)
         VALUES (@Id, @Level, @Skill, @Label, @Url, @CreatedByUserId, @CreatedAt, @UpdatedAt)`);
    }
    static async delete(resourceId) {
        const pool = await (0, db_1.getPool)();
        await pool
            .request()
            .input("ResourceId", resourceId)
            .query(`DELETE FROM dbo.LearningResourceRatings WHERE ResourceId = @ResourceId`);
        await pool
            .request()
            .input("Id", resourceId)
            .query(`DELETE FROM dbo.LearningResources WHERE Id = @Id`);
    }
    static async upsertRating(input) {
        const pool = await (0, db_1.getPool)();
        const now = new Date();
        // Upsert rating
        await pool
            .request()
            .input("ResourceId", input.resourceId)
            .input("UserId", input.userId)
            .input("Rating", input.rating)
            .input("Now", now)
            .query(`MERGE dbo.LearningResourceRatings AS target
         USING (SELECT @ResourceId AS ResourceId, @UserId AS UserId) AS source
         ON target.ResourceId = source.ResourceId AND target.UserId = source.UserId
         WHEN MATCHED THEN
           UPDATE SET Rating = @Rating, UpdatedAt = @Now
         WHEN NOT MATCHED THEN
           INSERT (ResourceId, UserId, Rating, CreatedAt, UpdatedAt)
           VALUES (@ResourceId, @UserId, @Rating, @Now, @Now);`);
        // Compute new aggregate
        const aggRes = await pool
            .request()
            .input("ResourceId", input.resourceId)
            .query(`SELECT COUNT(1) AS RatingCount,
                ISNULL(AVG(CAST(Rating AS FLOAT)), 0) AS AverageRating
         FROM dbo.LearningResourceRatings
         WHERE ResourceId = @ResourceId`);
        const row = aggRes.recordset && aggRes.recordset[0];
        return {
            ratingCount: Number(row?.RatingCount || 0),
            averageRating: Number(row?.AverageRating || 0),
        };
    }
}
exports.LearningResourceRepository = LearningResourceRepository;
