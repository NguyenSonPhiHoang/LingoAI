"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestController = void 0;
const test_repository_1 = require("../repositories/test.repository");
const testItem_repository_1 = require("../repositories/testItem.repository");
const db_1 = require("../db");
const uuid_1 = require("uuid");
// Use dynamic require to avoid TS declaration issues
const mssql = require("mssql");
class TestController {
    // GET /api/tests/me
    static async listMyTests(req, res) {
        try {
            const userId = req.user?.sub;
            if (!userId)
                return res.status(401).json({ error: "unauthorized" });
            const tests = await test_repository_1.TestRepository.findByUser(userId);
            res.json(tests);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // GET /api/tests/user/:userId (admin/teacher)
    static async listByUser(req, res) {
        try {
            const tests = await test_repository_1.TestRepository.findByUser(req.params.userId);
            res.json(tests);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // GET /api/tests/:id
    static async getById(req, res) {
        try {
            const test = await test_repository_1.TestRepository.findById(req.params.id);
            if (!test)
                return res.status(404).json({ error: "test not found" });
            res.json(test);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // POST /api/tests
    static async create(req, res) {
        try {
            const { type, data, score, items, contextType, contextId, skill, totalQuestions, correctAnswers, durationSeconds, clientCreatedAt, completedAt, version, } = req.body;
            const userId = req.user?.sub || null;
            const id = (0, uuid_1.v4)();
            const nowIso = new Date().toISOString();
            const testPayload = {
                id,
                userId,
                type,
                data: typeof data === "string" ? data : JSON.stringify(data),
                score,
                contextType: contextType ?? null,
                contextId: contextId ?? null,
                skill: skill ?? null,
                totalQuestions: typeof totalQuestions === "number" ? totalQuestions : null,
                correctAnswers: typeof correctAnswers === "number" ? correctAnswers : null,
                durationSeconds: typeof durationSeconds === "number" ? durationSeconds : null,
                clientCreatedAt: typeof clientCreatedAt === "string" ? clientCreatedAt : null,
                completedAt: typeof completedAt === "string" ? completedAt : null,
                version: typeof version === "number" ? version : null,
                createdAt: nowIso,
            };
            const hasItems = Array.isArray(items) && items.length > 0;
            // If items are present, prefer atomic insert when DB supports TestItems.
            if (hasItems) {
                const pool = await (0, db_1.getPool)();
                // Detect infrastructure; if missing, fall back to saving the test only.
                const infra = await pool
                    .request()
                    .query("SELECT OBJECT_ID('dbo.TestItems') AS TestItemsTable, OBJECT_ID('sp_TestItems_Insert') AS TestItemsInsertProc");
                const infraRow = infra.recordset?.[0] || {};
                const hasTestItems = !!infraRow.TestItemsTable && !!infraRow.TestItemsInsertProc;
                if (hasTestItems) {
                    const tx = new mssql.Transaction(pool);
                    await tx.begin();
                    try {
                        // Insert test
                        await new mssql.Request(tx)
                            .input("Id", testPayload.id)
                            .input("UserId", testPayload.userId)
                            .input("Type", testPayload.type)
                            .input("Data", testPayload.data)
                            .input("Score", testPayload.score ?? null)
                            .input("CreatedAt", new Date())
                            .input("ContextType", testPayload.contextType)
                            .input("ContextId", testPayload.contextId)
                            .input("Skill", testPayload.skill)
                            .input("TotalQuestions", testPayload.totalQuestions)
                            .input("CorrectAnswers", testPayload.correctAnswers)
                            .input("DurationSeconds", testPayload.durationSeconds)
                            .input("ClientCreatedAt", testPayload.clientCreatedAt
                            ? new Date(testPayload.clientCreatedAt)
                            : null)
                            .input("CompletedAt", testPayload.completedAt
                            ? new Date(testPayload.completedAt)
                            : null)
                            .input("Version", testPayload.version ?? null)
                            .execute("sp_Tests_Insert");
                        const baseType = typeof type === "string" ? type : null;
                        const baseSkill = typeof skill === "string" ? skill : null;
                        // Insert items
                        for (let idx = 0; idx < items.length; idx++) {
                            const it = items[idx];
                            const itemId = (0, uuid_1.v4)();
                            const itemKey = typeof it.itemKey === "string" ? it.itemKey : `item-${idx}`;
                            const kind = typeof it.kind === "string" ? it.kind : null;
                            const itemSkill = typeof it.skill === "string" ? it.skill : baseSkill;
                            const isCorrect = typeof it.isCorrect === "boolean" ? it.isCorrect : null;
                            const itemScore = typeof it.score === "number" ? it.score : null;
                            const itemData = typeof it.data === "string"
                                ? it.data
                                : JSON.stringify(it.data ?? it);
                            await new mssql.Request(tx)
                                .input("Id", itemId)
                                .input("TestId", id)
                                .input("UserId", userId)
                                .input("Type", baseType)
                                .input("Skill", itemSkill)
                                .input("Kind", kind)
                                .input("ItemKey", itemKey)
                                .input("IsCorrect", isCorrect)
                                .input("Score", itemScore)
                                .input("Data", itemData)
                                .input("CreatedAt", new Date())
                                .execute("sp_TestItems_Insert");
                        }
                        await tx.commit();
                        return res.status(201).json({ ...testPayload });
                    }
                    catch (e) {
                        try {
                            await tx.rollback();
                        }
                        catch {
                            // ignore
                        }
                        return res.status(500).json({ error: "Failed to save test items" });
                    }
                }
            }
            // Default: save test, then best-effort items (backward-compatible).
            const test = await test_repository_1.TestRepository.create({
                id,
                userId,
                type,
                data: testPayload.data,
                score,
                contextType: testPayload.contextType,
                contextId: testPayload.contextId,
                skill: testPayload.skill,
                totalQuestions: testPayload.totalQuestions,
                correctAnswers: testPayload.correctAnswers,
                durationSeconds: testPayload.durationSeconds,
                clientCreatedAt: testPayload.clientCreatedAt,
                completedAt: testPayload.completedAt,
                version: testPayload.version,
            });
            if (hasItems) {
                const baseType = typeof type === "string" ? type : null;
                const baseSkill = typeof skill === "string" ? skill : null;
                await Promise.all(items.map(async (it, idx) => {
                    const itemId = (0, uuid_1.v4)();
                    const itemKey = typeof it.itemKey === "string" ? it.itemKey : `item-${idx}`;
                    const kind = typeof it.kind === "string" ? it.kind : null;
                    const itemSkill = typeof it.skill === "string" ? it.skill : baseSkill;
                    const isCorrect = typeof it.isCorrect === "boolean" ? it.isCorrect : null;
                    const itemScore = typeof it.score === "number" ? it.score : null;
                    const itemData = typeof it.data === "string"
                        ? it.data
                        : JSON.stringify(it.data ?? it);
                    await testItem_repository_1.TestItemRepository.create({
                        id: itemId,
                        testId: id,
                        userId,
                        type: baseType,
                        skill: itemSkill,
                        kind,
                        itemKey,
                        isCorrect,
                        score: itemScore,
                        data: itemData,
                    });
                })).catch(() => {
                    // ignore item persistence failures
                });
            }
            res.status(201).json(test);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // GET /api/tests/:id/items
    static async listItemsByTest(req, res) {
        try {
            const userId = req.user?.sub;
            if (!userId)
                return res.status(401).json({ error: "unauthorized" });
            const test = await test_repository_1.TestRepository.findById(req.params.id);
            if (!test)
                return res.status(404).json({ error: "test not found" });
            if (test.userId && test.userId !== userId)
                return res.status(403).json({ error: "forbidden" });
            const items = await testItem_repository_1.TestItemRepository.listByTest(req.params.id);
            res.json(items);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // PUT /api/tests/:id
    static async update(req, res) {
        try {
            const { data, score, contextType, contextId, skill, totalQuestions, correctAnswers, durationSeconds, clientCreatedAt, completedAt, version, } = req.body;
            await test_repository_1.TestRepository.update({
                id: req.params.id,
                data: typeof data === "string" ? data : JSON.stringify(data),
                score,
                contextType: contextType ?? null,
                contextId: contextId ?? null,
                skill: skill ?? null,
                totalQuestions: typeof totalQuestions === "number" ? totalQuestions : null,
                correctAnswers: typeof correctAnswers === "number" ? correctAnswers : null,
                durationSeconds: typeof durationSeconds === "number" ? durationSeconds : null,
                clientCreatedAt: typeof clientCreatedAt === "string" ? clientCreatedAt : null,
                completedAt: typeof completedAt === "string" ? completedAt : null,
                version: typeof version === "number" ? version : null,
            });
            res.json({ ok: true });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // DELETE /api/tests/:id
    static async delete(req, res) {
        try {
            await test_repository_1.TestRepository.delete(req.params.id);
            res.json({ ok: true });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}
exports.TestController = TestController;
