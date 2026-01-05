import { Request, Response } from "express";
import { LessonRepository } from "../repositories/lesson.repository";
import { v4 as uuid } from "uuid";
import { AuthRequest } from "../middleware/auth.middleware";

export class LessonController {
  // GET /api/lessons
  static async list(req: Request, res: Response) {
    try {
      const lessons = await LessonRepository.findAll();
      res.json(lessons);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // GET /api/lessons/:id
  static async getById(req: Request, res: Response) {
    try {
      const lesson = await LessonRepository.findById(req.params.id);
      if (!lesson) return res.status(404).json({ error: "lesson not found" });
      res.json(lesson);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // GET /api/lessons/author/:authorId
  static async getByAuthor(req: Request, res: Response) {
    try {
      const lessons = await LessonRepository.findByAuthor(req.params.authorId);
      res.json(lessons);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // POST /api/lessons
  static async create(req: AuthRequest, res: Response) {
    try {
      const { title, description, content, level, language, isPublished } =
        req.body;
      if (!title) return res.status(400).json({ error: "title required" });
      const id = uuid();
      const authorId = req.user?.sub || null;
      const lesson = await LessonRepository.create({
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
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // PUT /api/lessons/:id
  static async update(req: Request, res: Response) {
    try {
      const { title, description, content, level, language, isPublished } =
        req.body;
      await LessonRepository.update({
        id: req.params.id,
        title,
        description,
        content,
        level,
        language,
        isPublished,
      });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // DELETE /api/lessons/:id
  static async delete(req: Request, res: Response) {
    try {
      await LessonRepository.delete(req.params.id);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // POST /api/lessons/:id/vocabulary
  static async addVocabulary(req: Request, res: Response) {
    try {
      const { vocabId } = req.body;
      if (!vocabId) return res.status(400).json({ error: "vocabId required" });
      await LessonRepository.addVocabulary(req.params.id, vocabId);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // DELETE /api/lessons/:id/vocabulary/:vocabId
  static async removeVocabulary(req: Request, res: Response) {
    try {
      await LessonRepository.removeVocabulary(
        req.params.id,
        req.params.vocabId
      );
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // GET /api/lessons/:id/vocabulary
  static async getVocabulary(req: Request, res: Response) {
    try {
      const vocab = await LessonRepository.getVocabulary(req.params.id);
      res.json(vocab);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
