import { Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { WordRepository } from "../repositories/word.repository";
import {
  UserVocabularyRepository,
  UserVocabularyUpsertInput,
} from "../repositories/userVocabulary.repository";

function normalizeTerm(term: string): string {
  return term.trim().toLowerCase();
}

export class UserVocabularyController {
  // GET /api/user-vocabulary/me
  static async listMe(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const userId = user?.sub;
      if (!userId) return res.status(401).json({ error: "unauthorized" });

      const items = await UserVocabularyRepository.listByUser(userId);
      res.json(items);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // POST /api/user-vocabulary
  static async upsertMe(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const userId = user?.sub;
      if (!userId) return res.status(401).json({ error: "unauthorized" });

      const {
        term,
        pronunciation,
        audioUrl,
        partOfSpeech,
        definition,
        vietnameseDefinition,
        sentence,
        vietnameseSentence,
        sentenceAudioUrl,
        synonyms,
        antonyms,
        irregularForms,
        wordForms,
        favorite,
        topic,
      } = req.body || {};

      if (!term || typeof term !== "string") {
        return res.status(400).json({ error: "term required" });
      }

      const termNormalized = normalizeTerm(term);
      let word = await WordRepository.findByNormalized(termNormalized);

      if (!word) {
        word = await WordRepository.create({
          id: uuid(),
          term,
          term_normalized: termNormalized,
          pronunciation:
            typeof pronunciation === "string" ? pronunciation : null,
          audioUrl: typeof audioUrl === "string" ? audioUrl : null,
        });
      } else {
        const incomingPronunciation =
          typeof pronunciation === "string" ? pronunciation.trim() : "";
        const incomingAudioUrl = typeof audioUrl === "string" ? audioUrl : "";

        const needsPronunciation =
          !!incomingPronunciation &&
          (!word.pronunciation || !word.pronunciation.trim());
        const needsAudioUrl =
          !!incomingAudioUrl && (!word.audioUrl || !word.audioUrl.trim());

        if (needsPronunciation || needsAudioUrl) {
          await WordRepository.update({
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

      const input: UserVocabularyUpsertInput = {
        id: uuid(),
        userId,
        wordId: word.id,
        partOfSpeech: typeof partOfSpeech === "string" ? partOfSpeech : null,
        definition: typeof definition === "string" ? definition : null,
        vietnameseDefinition:
          typeof vietnameseDefinition === "string"
            ? vietnameseDefinition
            : null,
        sentence: typeof sentence === "string" ? sentence : null,
        vietnameseSentence:
          typeof vietnameseSentence === "string" ? vietnameseSentence : null,
        sentenceAudioUrl:
          typeof sentenceAudioUrl === "string" ? sentenceAudioUrl : null,
        synonyms: Array.isArray(synonyms) ? synonyms : null,
        antonyms: Array.isArray(antonyms) ? antonyms : null,
        irregularForms:
          irregularForms && typeof irregularForms === "object"
            ? irregularForms
            : null,
        wordForms:
          wordForms && typeof wordForms === "object" ? wordForms : null,
        favorite:
          typeof favorite === "boolean"
            ? favorite
            : favorite === 1
            ? true
            : null,
        topic: typeof topic === "string" ? topic : null,
      };

      const userVocabularyId = await UserVocabularyRepository.upsert(input);
      const combined = await UserVocabularyRepository.getById(
        userVocabularyId,
        userId
      );

      if (!combined) return res.status(500).json({ error: "upsert failed" });
      res.status(201).json(combined);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // POST /api/user-vocabulary/bulk
  static async bulkUpsertMe(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const userId = user?.sub;
      if (!userId) return res.status(401).json({ error: "unauthorized" });

      const { words } = req.body || {};
      if (!Array.isArray(words)) {
        return res.status(400).json({ error: "words array required" });
      }

      const results = [] as any[];

      for (const w of words) {
        if (!w?.term || typeof w.term !== "string") continue;

        const termNormalized = normalizeTerm(w.term);
        let word = await WordRepository.findByNormalized(termNormalized);
        if (!word) {
          word = await WordRepository.create({
            id: uuid(),
            term: w.term,
            term_normalized: termNormalized,
            pronunciation:
              typeof w.pronunciation === "string" ? w.pronunciation : null,
            audioUrl: typeof w.audioUrl === "string" ? w.audioUrl : null,
          });
        } else {
          const incomingPronunciation =
            typeof w.pronunciation === "string" ? w.pronunciation.trim() : "";
          const incomingAudioUrl =
            typeof w.audioUrl === "string" ? w.audioUrl : "";

          const needsPronunciation =
            !!incomingPronunciation &&
            (!word.pronunciation || !word.pronunciation.trim());
          const needsAudioUrl =
            !!incomingAudioUrl && (!word.audioUrl || !word.audioUrl.trim());

          if (needsPronunciation || needsAudioUrl) {
            await WordRepository.update({
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

        const input: UserVocabularyUpsertInput = {
          id: uuid(),
          userId,
          wordId: word.id,
          partOfSpeech:
            typeof w.partOfSpeech === "string" ? w.partOfSpeech : null,
          definition: typeof w.definition === "string" ? w.definition : null,
          vietnameseDefinition:
            typeof w.vietnameseDefinition === "string"
              ? w.vietnameseDefinition
              : null,
          sentence: typeof w.sentence === "string" ? w.sentence : null,
          vietnameseSentence:
            typeof w.vietnameseSentence === "string"
              ? w.vietnameseSentence
              : null,
          sentenceAudioUrl:
            typeof w.sentenceAudioUrl === "string" ? w.sentenceAudioUrl : null,
          synonyms: Array.isArray(w.synonyms) ? w.synonyms : null,
          antonyms: Array.isArray(w.antonyms) ? w.antonyms : null,
          irregularForms:
            w.irregularForms && typeof w.irregularForms === "object"
              ? w.irregularForms
              : null,
          wordForms:
            w.wordForms && typeof w.wordForms === "object" ? w.wordForms : null,
          topic: typeof w.topic === "string" ? w.topic : null,
        };

        const userVocabularyId = await UserVocabularyRepository.upsert(input);
        const combined = await UserVocabularyRepository.getById(
          userVocabularyId,
          userId
        );
        if (combined) results.push(combined);
      }

      res.status(201).json(results);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // PUT /api/user-vocabulary/:id
  static async updateMe(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const userId = user?.sub;
      if (!userId) return res.status(401).json({ error: "unauthorized" });

      const id = req.params.id;
      if (!id) return res.status(400).json({ error: "id required" });

      const updates = req.body || {};
      await UserVocabularyRepository.update(id, userId, {
        partOfSpeech:
          typeof updates.partOfSpeech === "string"
            ? updates.partOfSpeech
            : null,
        definition:
          typeof updates.definition === "string" ? updates.definition : null,
        vietnameseDefinition:
          typeof updates.vietnameseDefinition === "string"
            ? updates.vietnameseDefinition
            : null,
        sentence:
          typeof updates.sentence === "string" ? updates.sentence : null,
        vietnameseSentence:
          typeof updates.vietnameseSentence === "string"
            ? updates.vietnameseSentence
            : null,
        sentenceAudioUrl:
          typeof updates.sentenceAudioUrl === "string"
            ? updates.sentenceAudioUrl
            : null,
        synonyms: Array.isArray(updates.synonyms) ? updates.synonyms : null,
        antonyms: Array.isArray(updates.antonyms) ? updates.antonyms : null,
        irregularForms:
          updates.irregularForms && typeof updates.irregularForms === "object"
            ? updates.irregularForms
            : null,
        wordForms:
          updates.wordForms && typeof updates.wordForms === "object"
            ? updates.wordForms
            : null,
        favorite:
          typeof updates.favorite === "boolean"
            ? updates.favorite
            : updates.favorite === 1
            ? true
            : null,
        topic: typeof updates.topic === "string" ? updates.topic : null,
      });

      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // POST /api/user-vocabulary/:id/learn
  static async learnMe(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const userId = user?.sub;
      if (!userId) return res.status(401).json({ error: "unauthorized" });

      const id = req.params.id;
      if (!id) return res.status(400).json({ error: "id required" });

      const updated = await UserVocabularyRepository.incrementLearnCount(
        id,
        userId
      );
      if (!updated) return res.status(404).json({ error: "not found" });

      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // DELETE /api/user-vocabulary/:id
  static async deleteMe(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const userId = user?.sub;
      if (!userId) return res.status(401).json({ error: "unauthorized" });

      const id = req.params.id;
      if (!id) return res.status(400).json({ error: "id required" });

      await UserVocabularyRepository.delete(id, userId);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
