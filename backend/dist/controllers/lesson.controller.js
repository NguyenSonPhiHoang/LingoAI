"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LessonController = void 0;
const lesson_repository_1 = require("../repositories/lesson.repository");
const uuid_1 = require("uuid");
class LessonController {
    // GET /api/lessons
    static async list(req, res) {
        try {
            const lessons = await lesson_repository_1.LessonRepository.findAll();
            res.json(lessons);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // GET /api/lessons/:id
    static async getById(req, res) {
        try {
            const lesson = await lesson_repository_1.LessonRepository.findById(req.params.id);
            if (!lesson)
                return res.status(404).json({ error: "lesson not found" });
            res.json(lesson);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // GET /api/lessons/author/:authorId
    static async getByAuthor(req, res) {
        try {
            const lessons = await lesson_repository_1.LessonRepository.findByAuthor(req.params.authorId);
            res.json(lessons);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // POST /api/lessons
    static async create(req, res) {
        try {
            const { title, description, content, level, language, isPublished } = req.body;
            if (!title)
                return res.status(400).json({ error: "title required" });
            const id = (0, uuid_1.v4)();
            const authorId = req.user?.sub || null;
            const lesson = await lesson_repository_1.LessonRepository.create({
                id,
                title,
                description,
                content,
                level,
                language,
                authorId,
                isPublished: !!isPublished,
            });
            res.status(201).json(lesson);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // PUT /api/lessons/:id
    static async update(req, res) {
        try {
            const { title, description, content, level, language, isPublished } = req.body;
            await lesson_repository_1.LessonRepository.update({
                id: req.params.id,
                title,
                description,
                content,
                level,
                language,
                isPublished,
            });
            res.json({ ok: true });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // DELETE /api/lessons/:id
    static async delete(req, res) {
        try {
            await lesson_repository_1.LessonRepository.delete(req.params.id);
            res.json({ ok: true });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // POST /api/lessons/:id/vocabulary
    static async addVocabulary(req, res) {
        try {
            const { vocabId } = req.body;
            if (!vocabId)
                return res.status(400).json({ error: "vocabId required" });
            await lesson_repository_1.LessonRepository.addVocabulary(req.params.id, vocabId);
            res.json({ ok: true });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // DELETE /api/lessons/:id/vocabulary/:vocabId
    static async removeVocabulary(req, res) {
        try {
            await lesson_repository_1.LessonRepository.removeVocabulary(req.params.id, req.params.vocabId);
            res.json({ ok: true });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // GET /api/lessons/:id/vocabulary
    static async getVocabulary(req, res) {
        try {
            const vocab = await lesson_repository_1.LessonRepository.getVocabulary(req.params.id);
            res.json(vocab);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}
exports.LessonController = LessonController;
