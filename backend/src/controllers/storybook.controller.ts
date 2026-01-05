import { Request, Response } from "express";
import { StorybookRepository } from "../repositories/storybook.repository";
import { v4 as uuid } from "uuid";
import { AuthRequest } from "../middleware/auth.middleware";

export class StorybookController {
  // GET /api/storybooks
  static async list(req: Request, res: Response) {
    try {
      const storybooks = await StorybookRepository.findAll();
      res.json(storybooks);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // GET /api/storybooks/:id
  static async getById(req: Request, res: Response) {
    try {
      const storybook = await StorybookRepository.findById(req.params.id);
      if (!storybook)
        return res.status(404).json({ error: "storybook not found" });
      res.json(storybook);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // POST /api/storybooks
  static async create(req: AuthRequest, res: Response) {
    try {
      const { title, description, language, isPublished } = req.body;
      if (!title) return res.status(400).json({ error: "title required" });
      const id = uuid();
      const authorId = req.user?.sub || null;
      const storybook = await StorybookRepository.create({
        id,
        title,
        description,
        language,
        authorId,
        isPublished: !!isPublished,
      });
      res.status(201).json(storybook);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // PUT /api/storybooks/:id
  static async update(req: Request, res: Response) {
    try {
      const { title, description, language, isPublished } = req.body;
      await StorybookRepository.update({
        id: req.params.id,
        title,
        description,
        language,
        isPublished,
      });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // DELETE /api/storybooks/:id
  static async delete(req: Request, res: Response) {
    try {
      await StorybookRepository.delete(req.params.id);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // ===== PAGES =====

  // GET /api/storybooks/:id/pages
  static async getPages(req: Request, res: Response) {
    try {
      const pages = await StorybookRepository.getPages(req.params.id);
      res.json(pages);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // POST /api/storybooks/:id/pages
  static async createPage(req: Request, res: Response) {
    try {
      const { pageNumber, content, audioUrl } = req.body;
      if (pageNumber === undefined)
        return res.status(400).json({ error: "pageNumber required" });
      const id = uuid();
      const page = await StorybookRepository.createPage({
        id,
        storybookId: req.params.id,
        pageNumber,
        content,
        audioUrl,
      });
      res.status(201).json(page);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // PUT /api/storybooks/:storybookId/pages/:pageId
  static async updatePage(req: Request, res: Response) {
    try {
      const { pageNumber, content, audioUrl } = req.body;
      await StorybookRepository.updatePage({
        id: req.params.pageId,
        pageNumber,
        content,
        audioUrl,
      });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // DELETE /api/storybooks/:storybookId/pages/:pageId
  static async deletePage(req: Request, res: Response) {
    try {
      await StorybookRepository.deletePage(req.params.pageId);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
