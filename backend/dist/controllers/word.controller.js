"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WordController = void 0;
const word_repository_1 = require("../repositories/word.repository");
class WordController {
    // GET /api/words
    static async list(req, res) {
        try {
            const words = await word_repository_1.WordRepository.findAll();
            res.json(words);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // PUT /api/words/:id
    static async update(req, res) {
        try {
            const { term, pronunciation, audioUrl } = req.body || {};
            const id = req.params.id;
            if (!id)
                return res.status(400).json({ error: "id required" });
            let term_normalized = undefined;
            if (typeof term === "string") {
                term_normalized = term.trim().toLowerCase();
            }
            await word_repository_1.WordRepository.update({
                id,
                term: typeof term === "string" ? term : null,
                term_normalized: term_normalized ?? null,
                pronunciation: typeof pronunciation === "string" ? pronunciation : null,
                audioUrl: typeof audioUrl === "string" ? audioUrl : null,
            });
            res.json({ ok: true });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}
exports.WordController = WordController;
