"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserVocabularyController = void 0;
const uuid_1 = require("uuid");
const word_repository_1 = require("../repositories/word.repository");
const userVocabulary_repository_1 = require("../repositories/userVocabulary.repository");
function normalizeTerm(term) {
    return term.trim().toLowerCase();
}
class UserVocabularyController {
    // GET /api/user-vocabulary/me
    static async listMe(req, res) {
        try {
            const user = req.user;
            const userId = user?.sub;
            if (!userId)
                return res.status(401).json({ error: "unauthorized" });
            const items = await userVocabulary_repository_1.UserVocabularyRepository.listByUser(userId);
            res.json(items);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // POST /api/user-vocabulary
    static async upsertMe(req, res) {
        try {
            const user = req.user;
            const userId = user?.sub;
            if (!userId)
                return res.status(401).json({ error: "unauthorized" });
            const { term, pronunciation, audioUrl, partOfSpeech, definition, vietnameseDefinition, sentence, vietnameseSentence, sentenceAudioUrl, synonyms, antonyms, irregularForms, wordForms, favorite, topic, } = req.body || {};
            if (!term || typeof term !== "string") {
                return res.status(400).json({ error: "term required" });
            }
            const termNormalized = normalizeTerm(term);
            let word = await word_repository_1.WordRepository.findByNormalized(termNormalized);
            if (!word) {
                word = await word_repository_1.WordRepository.create({
                    id: (0, uuid_1.v4)(),
                    term,
                    term_normalized: termNormalized,
                    pronunciation: typeof pronunciation === "string" ? pronunciation : null,
                    audioUrl: typeof audioUrl === "string" ? audioUrl : null,
                });
            }
            else {
                const incomingPronunciation = typeof pronunciation === "string" ? pronunciation.trim() : "";
                const incomingAudioUrl = typeof audioUrl === "string" ? audioUrl : "";
                const needsPronunciation = !!incomingPronunciation &&
                    (!word.pronunciation || !word.pronunciation.trim());
                const needsAudioUrl = !!incomingAudioUrl && (!word.audioUrl || !word.audioUrl.trim());
                if (needsPronunciation || needsAudioUrl) {
                    await word_repository_1.WordRepository.update({
                        id: word.id,
                        pronunciation: needsPronunciation ? incomingPronunciation : null,
                        audioUrl: needsAudioUrl ? incomingAudioUrl : null,
                    });
                    word = {
                        ...word,
                        pronunciation: needsPronunciation
                            ? incomingPronunciation
                            : word.pronunciation,
                        audioUrl: needsAudioUrl ? incomingAudioUrl : word.audioUrl,
                    };
                }
            }
            const input = {
                id: (0, uuid_1.v4)(),
                userId,
                wordId: word.id,
                partOfSpeech: typeof partOfSpeech === "string" ? partOfSpeech : null,
                definition: typeof definition === "string" ? definition : null,
                vietnameseDefinition: typeof vietnameseDefinition === "string"
                    ? vietnameseDefinition
                    : null,
                sentence: typeof sentence === "string" ? sentence : null,
                vietnameseSentence: typeof vietnameseSentence === "string" ? vietnameseSentence : null,
                sentenceAudioUrl: typeof sentenceAudioUrl === "string" ? sentenceAudioUrl : null,
                synonyms: Array.isArray(synonyms) ? synonyms : null,
                antonyms: Array.isArray(antonyms) ? antonyms : null,
                irregularForms: irregularForms && typeof irregularForms === "object"
                    ? irregularForms
                    : null,
                wordForms: wordForms && typeof wordForms === "object" ? wordForms : null,
                favorite: typeof favorite === "boolean"
                    ? favorite
                    : favorite === 1
                        ? true
                        : null,
                topic: typeof topic === "string" ? topic : null,
            };
            const userVocabularyId = await userVocabulary_repository_1.UserVocabularyRepository.upsert(input);
            const combined = await userVocabulary_repository_1.UserVocabularyRepository.getById(userVocabularyId, userId);
            if (!combined)
                return res.status(500).json({ error: "upsert failed" });
            res.status(201).json(combined);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // POST /api/user-vocabulary/bulk
    static async bulkUpsertMe(req, res) {
        try {
            const user = req.user;
            const userId = user?.sub;
            if (!userId)
                return res.status(401).json({ error: "unauthorized" });
            const { words } = req.body || {};
            if (!Array.isArray(words)) {
                return res.status(400).json({ error: "words array required" });
            }
            const results = [];
            for (const w of words) {
                if (!w?.term || typeof w.term !== "string")
                    continue;
                const termNormalized = normalizeTerm(w.term);
                let word = await word_repository_1.WordRepository.findByNormalized(termNormalized);
                if (!word) {
                    word = await word_repository_1.WordRepository.create({
                        id: (0, uuid_1.v4)(),
                        term: w.term,
                        term_normalized: termNormalized,
                        pronunciation: typeof w.pronunciation === "string" ? w.pronunciation : null,
                        audioUrl: typeof w.audioUrl === "string" ? w.audioUrl : null,
                    });
                }
                else {
                    const incomingPronunciation = typeof w.pronunciation === "string" ? w.pronunciation.trim() : "";
                    const incomingAudioUrl = typeof w.audioUrl === "string" ? w.audioUrl : "";
                    const needsPronunciation = !!incomingPronunciation &&
                        (!word.pronunciation || !word.pronunciation.trim());
                    const needsAudioUrl = !!incomingAudioUrl && (!word.audioUrl || !word.audioUrl.trim());
                    if (needsPronunciation || needsAudioUrl) {
                        await word_repository_1.WordRepository.update({
                            id: word.id,
                            pronunciation: needsPronunciation ? incomingPronunciation : null,
                            audioUrl: needsAudioUrl ? incomingAudioUrl : null,
                        });
                        word = {
                            ...word,
                            pronunciation: needsPronunciation
                                ? incomingPronunciation
                                : word.pronunciation,
                            audioUrl: needsAudioUrl ? incomingAudioUrl : word.audioUrl,
                        };
                    }
                }
                const input = {
                    id: (0, uuid_1.v4)(),
                    userId,
                    wordId: word.id,
                    partOfSpeech: typeof w.partOfSpeech === "string" ? w.partOfSpeech : null,
                    definition: typeof w.definition === "string" ? w.definition : null,
                    vietnameseDefinition: typeof w.vietnameseDefinition === "string"
                        ? w.vietnameseDefinition
                        : null,
                    sentence: typeof w.sentence === "string" ? w.sentence : null,
                    vietnameseSentence: typeof w.vietnameseSentence === "string"
                        ? w.vietnameseSentence
                        : null,
                    sentenceAudioUrl: typeof w.sentenceAudioUrl === "string" ? w.sentenceAudioUrl : null,
                    synonyms: Array.isArray(w.synonyms) ? w.synonyms : null,
                    antonyms: Array.isArray(w.antonyms) ? w.antonyms : null,
                    irregularForms: w.irregularForms && typeof w.irregularForms === "object"
                        ? w.irregularForms
                        : null,
                    wordForms: w.wordForms && typeof w.wordForms === "object" ? w.wordForms : null,
                    topic: typeof w.topic === "string" ? w.topic : null,
                };
                const userVocabularyId = await userVocabulary_repository_1.UserVocabularyRepository.upsert(input);
                const combined = await userVocabulary_repository_1.UserVocabularyRepository.getById(userVocabularyId, userId);
                if (combined)
                    results.push(combined);
            }
            res.status(201).json(results);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // PUT /api/user-vocabulary/:id
    static async updateMe(req, res) {
        try {
            const user = req.user;
            const userId = user?.sub;
            if (!userId)
                return res.status(401).json({ error: "unauthorized" });
            const id = req.params.id;
            if (!id)
                return res.status(400).json({ error: "id required" });
            const updates = req.body || {};
            await userVocabulary_repository_1.UserVocabularyRepository.update(id, userId, {
                partOfSpeech: typeof updates.partOfSpeech === "string"
                    ? updates.partOfSpeech
                    : null,
                definition: typeof updates.definition === "string" ? updates.definition : null,
                vietnameseDefinition: typeof updates.vietnameseDefinition === "string"
                    ? updates.vietnameseDefinition
                    : null,
                sentence: typeof updates.sentence === "string" ? updates.sentence : null,
                vietnameseSentence: typeof updates.vietnameseSentence === "string"
                    ? updates.vietnameseSentence
                    : null,
                sentenceAudioUrl: typeof updates.sentenceAudioUrl === "string"
                    ? updates.sentenceAudioUrl
                    : null,
                synonyms: Array.isArray(updates.synonyms) ? updates.synonyms : null,
                antonyms: Array.isArray(updates.antonyms) ? updates.antonyms : null,
                irregularForms: updates.irregularForms && typeof updates.irregularForms === "object"
                    ? updates.irregularForms
                    : null,
                wordForms: updates.wordForms && typeof updates.wordForms === "object"
                    ? updates.wordForms
                    : null,
                favorite: typeof updates.favorite === "boolean"
                    ? updates.favorite
                    : updates.favorite === 1
                        ? true
                        : null,
                topic: typeof updates.topic === "string" ? updates.topic : null,
            });
            res.json({ ok: true });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // POST /api/user-vocabulary/:id/learn
    static async learnMe(req, res) {
        try {
            const user = req.user;
            const userId = user?.sub;
            if (!userId)
                return res.status(401).json({ error: "unauthorized" });
            const id = req.params.id;
            if (!id)
                return res.status(400).json({ error: "id required" });
            const updated = await userVocabulary_repository_1.UserVocabularyRepository.incrementLearnCount(id, userId);
            if (!updated)
                return res.status(404).json({ error: "not found" });
            res.json(updated);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // DELETE /api/user-vocabulary/:id
    static async deleteMe(req, res) {
        try {
            const user = req.user;
            const userId = user?.sub;
            if (!userId)
                return res.status(401).json({ error: "unauthorized" });
            const id = req.params.id;
            if (!id)
                return res.status(400).json({ error: "id required" });
            await userVocabulary_repository_1.UserVocabularyRepository.delete(id, userId);
            res.json({ ok: true });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}
exports.UserVocabularyController = UserVocabularyController;
