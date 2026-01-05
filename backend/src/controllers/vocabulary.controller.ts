import { Request, Response } from "express";
import { VocabularyRepository } from "../repositories/vocabulary.repository";
import { v4 as uuid } from "uuid";

export class VocabularyController {
  // GET /api/vocabulary
  static async list(req: Request, res: Response) {
    try {
      const vocab = await VocabularyRepository.findAll();
      res.json(vocab);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // GET /api/vocabulary/:id
  static async getById(req: Request, res: Response) {
    try {
      const vocab = await VocabularyRepository.findById(req.params.id);
      if (!vocab)
        return res.status(404).json({ error: "vocabulary not found" });
      res.json(vocab);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // POST /api/vocabulary
  static async create(req: Request, res: Response) {
    try {
      const {
        word,
        lemma,
        definition,
        example,
        partOfSpeech,
        pronunciation,
        audioUrl,
      } = req.body;
      if (!word) return res.status(400).json({ error: "word required" });
      const id = uuid();
      const vocab = await VocabularyRepository.create({
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
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // PUT /api/vocabulary/:id
  static async update(req: Request, res: Response) {
    try {
      const {
        word,
        lemma,
        definition,
        example,
        partOfSpeech,
        pronunciation,
        audioUrl,
      } = req.body;
      await VocabularyRepository.update({
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
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // DELETE /api/vocabulary/:id
  static async delete(req: Request, res: Response) {
    try {
      await VocabularyRepository.delete(req.params.id);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
