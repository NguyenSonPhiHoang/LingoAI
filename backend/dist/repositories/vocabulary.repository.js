"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VocabularyRepository = void 0;
const db_1 = require("../db");
class VocabularyRepository {
    // Insert via sp_Vocabulary_Insert
    static async create(vocab) {
        const pool = await (0, db_1.getPool)();
        const now = new Date();
        await pool
            .request()
            .input("Id", vocab.id)
            .input("Word", vocab.word)
            .input("Lemma", vocab.lemma || null)
            .input("Definition", vocab.definition || null)
            .input("Example", vocab.example || null)
            .input("PartOfSpeech", vocab.partOfSpeech || null)
            .input("Pronunciation", vocab.pronunciation || null)
            .input("AudioUrl", vocab.audioUrl || null)
            .input("CreatedAt", now)
            .execute("sp_Vocabulary_Insert");
        return { ...vocab, createdAt: now.toISOString() };
    }
    // Update via sp_Vocabulary_Update
    static async update(vocab) {
        const pool = await (0, db_1.getPool)();
        await pool
            .request()
            .input("Id", vocab.id)
            .input("Word", vocab.word || null)
            .input("Lemma", vocab.lemma || null)
            .input("Definition", vocab.definition || null)
            .input("Example", vocab.example || null)
            .input("PartOfSpeech", vocab.partOfSpeech || null)
            .input("Pronunciation", vocab.pronunciation || null)
            .input("AudioUrl", vocab.audioUrl || null)
            .execute("sp_Vocabulary_Update");
    }
    // Delete via sp_Vocabulary_Delete
    static async delete(id) {
        const pool = await (0, db_1.getPool)();
        await pool.request().input("Id", id).execute("sp_Vocabulary_Delete");
    }
    // Get by id via sp_Vocabulary_GetById
    static async findById(id) {
        const pool = await (0, db_1.getPool)();
        const res = await pool
            .request()
            .input("Id", id)
            .execute("sp_Vocabulary_GetById");
        const r = res.recordset[0];
        if (!r)
            return null;
        return mapRow(r);
    }
    // Get all via sp_Vocabulary_GetAll
    static async findAll() {
        const pool = await (0, db_1.getPool)();
        const res = await pool.request().execute("sp_Vocabulary_GetAll");
        return res.recordset.map(mapRow);
    }
}
exports.VocabularyRepository = VocabularyRepository;
function mapRow(r) {
    return {
        id: r.Id,
        word: r.Word,
        lemma: r.Lemma,
        definition: r.Definition,
        example: r.Example,
        partOfSpeech: r.PartOfSpeech,
        pronunciation: r.Pronunciation,
        audioUrl: r.AudioUrl,
        createdAt: r.CreatedAt ? new Date(r.CreatedAt).toISOString() : undefined,
    };
}
