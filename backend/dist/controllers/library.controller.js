"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LibraryController = void 0;
const uuid_1 = require("uuid");
const library_repository_1 = __importDefault(require("../repositories/library.repository"));
const SKILLS = [
    "Reading",
    "Writing",
    "Listening",
    "Speaking",
    "Pronunciation",
];
function getUserId(req) {
    const sub = req.user?.sub;
    return typeof sub === "string" && sub.trim() ? sub : null;
}
class LibraryController {
    static async listMyDocuments(req, res) {
        const userId = getUserId(req);
        if (!userId)
            return res.status(401).json({ error: "unauthorized" });
        const docs = await library_repository_1.default.listDocumentsByUser(userId);
        const grouped = {
            Reading: [],
            Writing: [],
            Listening: [],
            Speaking: [],
            Pronunciation: [],
        };
        for (const d of docs) {
            const key = SKILLS.includes(d.skill)
                ? d.skill
                : "Reading";
            grouped[key] = grouped[key] || [];
            grouped[key].push({
                id: d.id,
                userId: d.userId,
                skill: d.skill,
                title: d.title,
                url: d.url || "",
                summary: d.summary || "",
                createdAt: d.createdAt ? new Date(d.createdAt) : new Date(),
            });
        }
        return res.json(grouped);
    }
    static async getMyDocument(req, res) {
        const userId = getUserId(req);
        if (!userId)
            return res.status(401).json({ error: "unauthorized" });
        const id = req.params.id;
        const doc = await library_repository_1.default.getDocumentById(id, userId);
        if (!doc)
            return res.status(404).json({ error: "not found" });
        return res.json({
            id: doc.id,
            userId: doc.userId,
            skill: doc.skill,
            title: doc.title,
            url: doc.url || "",
            summary: doc.summary || "",
            createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
        });
    }
    static async createMyDocument(req, res) {
        const userId = getUserId(req);
        if (!userId)
            return res.status(401).json({ error: "unauthorized" });
        const { title, url, skill, summary } = req.body || {};
        if (!title || typeof title !== "string") {
            return res.status(400).json({ error: "title required" });
        }
        if (!skill || !SKILLS.includes(skill)) {
            return res.status(400).json({ error: "invalid skill" });
        }
        const created = await library_repository_1.default.createDocument({
            id: (0, uuid_1.v4)(),
            userId,
            title: title.trim(),
            url: typeof url === "string" ? url.trim() : null,
            skill,
            summary: typeof summary === "string" ? summary : "",
            sourceType: "manual",
        });
        return res.status(201).json({
            id: created.id,
            userId: created.userId,
            skill: created.skill,
            title: created.title,
            url: created.url || "",
            summary: created.summary || "",
            createdAt: created.createdAt ? new Date(created.createdAt) : new Date(),
        });
    }
    static async updateMyDocument(req, res) {
        const userId = getUserId(req);
        if (!userId)
            return res.status(401).json({ error: "unauthorized" });
        const id = req.params.id;
        const { title, url, skill, summary } = req.body || {};
        const updated = await library_repository_1.default.updateDocument(id, userId, {
            title: typeof title === "string" ? title.trim() : undefined,
            url: typeof url === "string" ? url.trim() : undefined,
            skill: typeof skill === "string" ? skill : undefined,
            summary: typeof summary === "string" ? summary : undefined,
        });
        if (!updated)
            return res.status(404).json({ error: "not found" });
        return res.json({
            id: updated.id,
            userId: updated.userId,
            skill: updated.skill,
            title: updated.title,
            url: updated.url || "",
            summary: updated.summary || "",
            createdAt: updated.createdAt ? new Date(updated.createdAt) : new Date(),
        });
    }
    static async deleteMyDocument(req, res) {
        const userId = getUserId(req);
        if (!userId)
            return res.status(401).json({ error: "unauthorized" });
        const id = req.params.id;
        // idempotent delete
        await library_repository_1.default.deleteDocument(id, userId);
        return res.json({ ok: true });
    }
    static async listMyContent(req, res) {
        const userId = getUserId(req);
        if (!userId)
            return res.status(401).json({ error: "unauthorized" });
        const docId = req.params.id;
        // ensure doc exists + owned
        const doc = await library_repository_1.default.getDocumentById(docId, userId);
        if (!doc)
            return res.status(404).json({ error: "not found" });
        const content = await library_repository_1.default.listContentsForDocument(docId, userId);
        return res.json(content.map((c) => ({
            id: c.id,
            docId: c.docId,
            userId: c.userId,
            fileName: c.fileName,
            type: c.type,
            content: c.content,
            createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
        })));
    }
    static async addMyContent(req, res) {
        const userId = getUserId(req);
        if (!userId)
            return res.status(401).json({ error: "unauthorized" });
        const docId = req.params.id;
        const doc = await library_repository_1.default.getDocumentById(docId, userId);
        if (!doc)
            return res.status(404).json({ error: "not found" });
        const { fileName, type, content } = req.body || {};
        if (!fileName || typeof fileName !== "string") {
            return res.status(400).json({ error: "fileName required" });
        }
        if (type !== "markdown" && type !== "image") {
            return res.status(400).json({ error: "invalid type" });
        }
        if (!content || typeof content !== "string") {
            return res.status(400).json({ error: "content required" });
        }
        const created = await library_repository_1.default.createContent({
            id: (0, uuid_1.v4)(),
            docId,
            userId,
            fileName: fileName.trim(),
            type: type,
            content,
        });
        return res.status(201).json({
            id: created.id,
            docId: created.docId,
            userId: created.userId,
            fileName: created.fileName,
            type: created.type,
            content: created.content,
            createdAt: created.createdAt ? new Date(created.createdAt) : new Date(),
        });
    }
    static async updateMyContent(req, res) {
        const userId = getUserId(req);
        if (!userId)
            return res.status(401).json({ error: "unauthorized" });
        const contentId = req.params.contentId;
        const { fileName, content } = req.body || {};
        const updated = await library_repository_1.default.updateContent(contentId, userId, {
            fileName: typeof fileName === "string" ? fileName.trim() : undefined,
            content: typeof content === "string" ? content : undefined,
        });
        if (!updated)
            return res.status(404).json({ error: "not found" });
        return res.json({
            id: updated.id,
            docId: updated.docId,
            userId: updated.userId,
            fileName: updated.fileName,
            type: updated.type,
            content: updated.content,
            createdAt: updated.createdAt ? new Date(updated.createdAt) : new Date(),
        });
    }
    static async deleteMyContent(req, res) {
        const userId = getUserId(req);
        if (!userId)
            return res.status(401).json({ error: "unauthorized" });
        const contentId = req.params.contentId;
        await library_repository_1.default.deleteContent(contentId, userId);
        return res.json({ ok: true });
    }
    static async getMyNotePage(req, res) {
        const userId = getUserId(req);
        if (!userId)
            return res.status(401).json({ error: "unauthorized" });
        const docId = req.params.id;
        const doc = await library_repository_1.default.getDocumentById(docId, userId);
        if (!doc)
            return res.status(404).json({ error: "not found" });
        const supported = await library_repository_1.default.isNotePageSupported();
        if (!supported)
            return res.json({ note: null });
        const note = await library_repository_1.default.getNotePageForDocument(docId, userId);
        if (!note)
            return res.json({ note: null });
        return res.json({
            note: {
                id: note.id,
                docId: note.docId,
                userId: note.userId,
                fileName: note.fileName,
                type: note.type,
                content: note.content,
                isNotePage: true,
                createdAt: note.createdAt ? new Date(note.createdAt) : new Date(),
                updatedAt: note.updatedAt ? new Date(note.updatedAt) : new Date(),
            },
        });
    }
    static async upsertMyNotePage(req, res) {
        const userId = getUserId(req);
        if (!userId)
            return res.status(401).json({ error: "unauthorized" });
        const docId = req.params.id;
        const doc = await library_repository_1.default.getDocumentById(docId, userId);
        if (!doc)
            return res.status(404).json({ error: "not found" });
        const supported = await library_repository_1.default.isNotePageSupported();
        if (!supported) {
            return res.status(409).json({
                error: "note-page not supported",
                detail: "Database schema is missing dbo.LibraryContents.IsNotePage. Apply migration backend/db/migrations/20260109_add_library_note_page.sql (or update schema.sql) and retry.",
            });
        }
        const { fileName, content } = req.body || {};
        if (typeof content !== "string") {
            return res.status(400).json({ error: "content required" });
        }
        const existing = await library_repository_1.default.getNotePageForDocument(docId, userId);
        if (existing) {
            const updated = await library_repository_1.default.updateContent(existing.id, userId, {
                fileName: typeof fileName === "string" && fileName.trim()
                    ? fileName.trim()
                    : existing.fileName,
                content,
            });
            if (!updated)
                return res.status(404).json({ error: "not found" });
            return res.json({
                note: {
                    id: updated.id,
                    docId: updated.docId,
                    userId: updated.userId,
                    fileName: updated.fileName,
                    type: updated.type,
                    content: updated.content,
                    isNotePage: true,
                    createdAt: updated.createdAt
                        ? new Date(updated.createdAt)
                        : new Date(),
                    updatedAt: updated.updatedAt
                        ? new Date(updated.updatedAt)
                        : new Date(),
                },
            });
        }
        const created = await library_repository_1.default.createContent({
            id: (0, uuid_1.v4)(),
            docId,
            userId,
            fileName: typeof fileName === "string" && fileName.trim()
                ? fileName.trim()
                : "Note",
            type: "markdown",
            content,
            isNotePage: true,
        });
        return res.status(201).json({
            note: {
                id: created.id,
                docId: created.docId,
                userId: created.userId,
                fileName: created.fileName,
                type: created.type,
                content: created.content,
                isNotePage: true,
                createdAt: created.createdAt ? new Date(created.createdAt) : new Date(),
                updatedAt: created.updatedAt ? new Date(created.updatedAt) : new Date(),
            },
        });
    }
}
exports.LibraryController = LibraryController;
exports.default = LibraryController;
