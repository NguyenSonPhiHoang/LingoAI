"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VocabularyController = void 0;
const vocabulary_repository_1 = require("../repositories/vocabulary.repository");
const uuid_1 = require("uuid");
class VocabularyController {
    // GET /api/vocabulary
    static async list(req, res) {
        try {
            const vocab = await vocabulary_repository_1.VocabularyRepository.findAll();
            res.json(vocab);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // GET /api/vocabulary/:id
    static async getById(req, res) {
        try {
            const vocab = await vocabulary_repository_1.VocabularyRepository.findById(req.params.id);
            if (!vocab)
                return res.status(404).json({ error: "vocabulary not found" });
            res.json(vocab);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // POST /api/vocabulary
    static async create(req, res) {
        try {
            const { word, lemma, definition, example, partOfSpeech, pronunciation, audioUrl, } = req.body;
            if (!word)
                return res.status(400).json({ error: "word required" });
            const id = (0, uuid_1.v4)();
            const vocab = await vocabulary_repository_1.VocabularyRepository.create({
                id,
                word,
                lemma,
                definition,
                example,
                partOfSpeech,
                pronunciation,
                audioUrl,
            });
            res.status(201).json(vocab);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // PUT /api/vocabulary/:id
    static async update(req, res) {
        try {
            const { word, lemma, definition, example, partOfSpeech, pronunciation, audioUrl, } = req.body;
            await vocabulary_repository_1.VocabularyRepository.update({
                id: req.params.id,
                word,
                lemma,
                definition,
                example,
                partOfSpeech,
                pronunciation,
                audioUrl,
            });
            res.json({ ok: true });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // DELETE /api/vocabulary/:id
    static async delete(req, res) {
        try {
            await vocabulary_repository_1.VocabularyRepository.delete(req.params.id);
            res.json({ ok: true });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}
exports.VocabularyController = VocabularyController;
