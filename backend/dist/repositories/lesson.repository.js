"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LessonRepository = void 0;
const db_1 = require("../db");
class LessonRepository {
    // Insert via sp_Lessons_Insert
    static async create(lesson) {
        const pool = await (0, db_1.getPool)();
        const now = new Date();
        await pool
            .request()
            .input("Id", lesson.id)
            .input("Title", lesson.title)
            .input("Description", lesson.description || null)
            .input("Content", lesson.content || null)
            .input("Level", lesson.level || null)
            .input("Language", lesson.language || null)
            .input("AuthorId", lesson.authorId || null)
            .input("IsPublished", lesson.isPublished ? 1 : 0)
            .input("CreatedAt", now)
            .input("UpdatedAt", now)
            .execute("sp_Lessons_Insert");
        return {
            ...lesson,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
        };
    }
    // Update via sp_Lessons_Update
    static async update(lesson) {
        const pool = await (0, db_1.getPool)();
        await pool
            .request()
            .input("Id", lesson.id)
            .input("Title", lesson.title || null)
            .input("Description", lesson.description || null)
            .input("Content", lesson.content || null)
            .input("Level", lesson.level || null)
            .input("Language", lesson.language || null)
            .input("IsPublished", lesson.isPublished ? 1 : 0)
            .input("UpdatedAt", new Date())
            .execute("sp_Lessons_Update");
    }
    // Delete via sp_Lessons_Delete
    static async delete(id) {
        const pool = await (0, db_1.getPool)();
        await pool.request().input("Id", id).execute("sp_Lessons_Delete");
    }
    // Get by id via sp_Lessons_GetById
    static async findById(id) {
        const pool = await (0, db_1.getPool)();
        const res = await pool
            .request()
            .input("Id", id)
            .execute("sp_Lessons_GetById");
        const r = res.recordset[0];
        if (!r)
            return null;
        return mapRow(r);
    }
    // Get all via sp_Lessons_GetAll
    static async findAll() {
        const pool = await (0, db_1.getPool)();
        const res = await pool.request().execute("sp_Lessons_GetAll");
        return res.recordset.map(mapRow);
    }
    // Get by author via sp_Lessons_GetByAuthor
    static async findByAuthor(authorId) {
        const pool = await (0, db_1.getPool)();
        const res = await pool
            .request()
            .input("AuthorId", authorId)
            .execute("sp_Lessons_GetByAuthor");
        return res.recordset.map(mapRow);
    }
    // Link vocabulary via sp_LessonVocabulary_Insert
    static async addVocabulary(lessonId, vocabId) {
        const pool = await (0, db_1.getPool)();
        await pool
            .request()
            .input("LessonId", lessonId)
            .input("VocabId", vocabId)
            .execute("sp_LessonVocabulary_Insert");
    }
    // Unlink vocabulary via sp_LessonVocabulary_Delete
    static async removeVocabulary(lessonId, vocabId) {
        const pool = await (0, db_1.getPool)();
        await pool
            .request()
            .input("LessonId", lessonId)
            .input("VocabId", vocabId)
            .execute("sp_LessonVocabulary_Delete");
    }
    // Get vocabulary for lesson via sp_LessonVocabulary_GetByLesson
    static async getVocabulary(lessonId) {
        const pool = await (0, db_1.getPool)();
        const res = await pool
            .request()
            .input("LessonId", lessonId)
            .execute("sp_LessonVocabulary_GetByLesson");
        return res.recordset;
    }
}
exports.LessonRepository = LessonRepository;
function mapRow(r) {
    return {
        id: r.Id,
        title: r.Title,
        description: r.Description,
        content: r.Content,
        level: r.Level,
        language: r.Language,
        authorId: r.AuthorId,
        isPublished: !!r.IsPublished,
        createdAt: r.CreatedAt ? new Date(r.CreatedAt).toISOString() : undefined,
        updatedAt: r.UpdatedAt ? new Date(r.UpdatedAt).toISOString() : undefined,
    };
}
