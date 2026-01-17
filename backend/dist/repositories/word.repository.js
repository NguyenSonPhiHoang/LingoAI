"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WordRepository = void 0;
const db_1 = require("../db");
function mapRow(r) {
    return {
        id: r.Id,
        term: r.Term,
        term_normalized: r.TermNormalized,
        pronunciation: r.Pronunciation ?? null,
        audioUrl: r.AudioUrl ?? null,
        createdAt: r.CreatedAt ? new Date(r.CreatedAt).toISOString() : undefined,
    };
}
class WordRepository {
    static async findByNormalized(termNormalized) {
        const pool = await (0, db_1.getPool)();
        const res = await pool
            .request()
            .input("TermNormalized", termNormalized)
            .execute("sp_Words_GetByNormalized");
        const r = res.recordset?.[0];
        return r ? mapRow(r) : null;
    }
    static async findById(id) {
        const pool = await (0, db_1.getPool)();
        const res = await pool
            .request()
            .input("Id", id)
            .execute("sp_Words_GetById");
        const r = res.recordset?.[0];
        return r ? mapRow(r) : null;
    }
    static async create(word) {
        const pool = await (0, db_1.getPool)();
        const now = new Date();
        await pool
            .request()
            .input("Id", word.id)
            .input("Term", word.term)
            .input("TermNormalized", word.term_normalized)
            .input("Pronunciation", word.pronunciation ?? null)
            .input("AudioUrl", word.audioUrl ?? null)
            .input("CreatedAt", now)
            .execute("sp_Words_Insert");
        return {
            id: word.id,
            term: word.term,
            term_normalized: word.term_normalized,
            pronunciation: word.pronunciation ?? null,
            audioUrl: word.audioUrl ?? null,
            createdAt: now.toISOString(),
        };
    }
    static async update(word) {
        const pool = await (0, db_1.getPool)();
        await pool
            .request()
            .input("Id", word.id)
            .input("Term", word.term ?? null)
            .input("TermNormalized", word.term_normalized ?? null)
            .input("Pronunciation", word.pronunciation ?? null)
            .input("AudioUrl", word.audioUrl ?? null)
            .execute("sp_Words_Update");
    }
    static async findAll() {
        const pool = await (0, db_1.getPool)();
        const res = await pool.request().execute("sp_Words_GetAll");
        return (res.recordset || []).map(mapRow);
    }
}
exports.WordRepository = WordRepository;
