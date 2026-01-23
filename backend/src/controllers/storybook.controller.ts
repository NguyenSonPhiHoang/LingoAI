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

  // GET /api/storybooks/me
  static async listMe(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) return res.status(401).json({ error: "unauthorized" });

      const storybooks = await StorybookRepository.findByAuthor(userId);
      res.json(storybooks.map((s) => toClientStorybook(s)));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // GET /api/storybooks/me/by-lesson/:lessonId
  static async listMeByLesson(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) return res.status(401).json({ error: "unauthorized" });

      const lessonId = (req.params.lessonId || "").trim();
      if (!lessonId)
        return res.status(400).json({ error: "lessonId required" });

      const storybooks = await StorybookRepository.findByLessonForAuthor(
        userId,
        lessonId
      );
      res.json(storybooks.map((s) => toClientStorybook(s)));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // GET /api/storybooks/me/:id
  static async getMyById(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) return res.status(401).json({ error: "unauthorized" });

      const storybook = await StorybookRepository.findById(req.params.id);
      if (!storybook)
        return res.status(404).json({ error: "storybook not found" });

      if (storybook.authorId !== userId) {
        return res.status(403).json({ error: "forbidden" });
      }

      res.json(toClientStorybook(storybook));
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
      const {
        lessonId,
        title,
        description,
        language,
        isPublished,
        level,
        format,
        status,
        keyVocabulary,
        englishStory,
        vietnameseStory,
        interspersedStory,
        fullEnglishStory,
        titleAudioUrl,
        englishContentAudioUrl,
        vietnameseContentAudioUrl,
      } = req.body;
      if (!title) return res.status(400).json({ error: "title required" });
      const id = uuid();
      const authorId = req.user?.sub || null;
      const storybook = await StorybookRepository.create({
        id,
        title,
        description,
        language,
        authorId,
        level,
        format,
        status,
        keyVocabulary: Array.isArray(keyVocabulary) ? keyVocabulary : null,
        englishStory: typeof englishStory === "string" ? englishStory : null,
        vietnameseStory:
          typeof vietnameseStory === "string" ? vietnameseStory : null,
        interspersedStory:
          typeof interspersedStory === "string" ? interspersedStory : null,
        fullEnglishStory:
          typeof fullEnglishStory === "string" ? fullEnglishStory : null,
        titleAudioUrl: typeof titleAudioUrl === "string" ? titleAudioUrl : null,
        englishContentAudioUrl:
          typeof englishContentAudioUrl === "string"
            ? englishContentAudioUrl
            : null,
        vietnameseContentAudioUrl:
          typeof vietnameseContentAudioUrl === "string"
            ? vietnameseContentAudioUrl
            : null,
        isPublished: !!isPublished,
      });

      if (typeof lessonId === "string" && lessonId.trim()) {
        try {
          await StorybookRepository.linkToLesson(id, lessonId.trim());
        } catch (linkErr) {
          // Best-effort rollback so we don't leave unlinked storybooks when the caller expected linking.
          await StorybookRepository.delete(id).catch(() => undefined);
          throw linkErr;
        }
      }

      res.status(201).json(toClientStorybook(storybook));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // PUT /api/storybooks/:id
  static async update(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) return res.status(401).json({ error: "unauthorized" });

      const existing = await StorybookRepository.findById(req.params.id);
      if (!existing)
        return res.status(404).json({ error: "storybook not found" });

      if (existing.authorId !== userId) {
        return res.status(403).json({ error: "forbidden" });
      }

      const {
        title,
        description,
        language,
        isPublished,
        level,
        format,
        status,
        keyVocabulary,
        englishStory,
        vietnameseStory,
        interspersedStory,
        fullEnglishStory,
        titleAudioUrl,
        englishContentAudioUrl,
        vietnameseContentAudioUrl,
      } = req.body || {};

      await StorybookRepository.update({
        id: req.params.id,
        authorId: userId,
        title: typeof title === "string" ? title : undefined,
        description: typeof description === "string" ? description : undefined,
        language: typeof language === "string" ? language : undefined,
        isPublished:
          typeof isPublished === "boolean"
            ? isPublished
            : isPublished === 1
            ? true
            : isPublished === 0
            ? false
            : undefined,
        level: typeof level === "string" ? level : undefined,
        format: typeof format === "string" ? format : undefined,
        status: typeof status === "string" ? status : undefined,
        keyVocabulary: Array.isArray(keyVocabulary) ? keyVocabulary : undefined,
        englishStory:
          typeof englishStory === "string" ? englishStory : undefined,
        vietnameseStory:
          typeof vietnameseStory === "string" ? vietnameseStory : undefined,
        interspersedStory:
          typeof interspersedStory === "string" ? interspersedStory : undefined,
        fullEnglishStory:
          typeof fullEnglishStory === "string" ? fullEnglishStory : undefined,
        titleAudioUrl:
          typeof titleAudioUrl === "string" ? titleAudioUrl : undefined,
        englishContentAudioUrl:
          typeof englishContentAudioUrl === "string"
            ? englishContentAudioUrl
            : undefined,
        vietnameseContentAudioUrl:
          typeof vietnameseContentAudioUrl === "string"
            ? vietnameseContentAudioUrl
            : undefined,
      });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // DELETE /api/storybooks/:id
  static async delete(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) return res.status(401).json({ error: "unauthorized" });

      const existing = await StorybookRepository.findById(req.params.id);
      if (!existing)
        return res.status(404).json({ error: "storybook not found" });

      if (existing.authorId !== userId) {
        return res.status(403).json({ error: "forbidden" });
      }

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

function toClientStorybook(sb: any) {
  return {
    id: sb.id,
    userId: sb.authorId,
    title: sb.title,
    description: sb.description ?? null,
    language: sb.language ?? null,
    level: sb.level ?? null,
    format: sb.format ?? null,
    status: sb.status ?? null,
    keyVocabulary: sb.keyVocabulary ?? [],
    englishStory: sb.englishStory ?? null,
    vietnameseStory: sb.vietnameseStory ?? null,
    interspersedStory: sb.interspersedStory ?? null,
    fullEnglishStory: sb.fullEnglishStory ?? null,
    titleAudioUrl: sb.titleAudioUrl ?? null,
    englishContentAudioUrl: sb.englishContentAudioUrl ?? null,
    vietnameseContentAudioUrl: sb.vietnameseContentAudioUrl ?? null,
    createdAt: sb.createdAt,
    updatedAt: sb.updatedAt,
  };
}
