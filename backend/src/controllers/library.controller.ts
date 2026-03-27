import { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { AuthRequest } from "../middleware/auth.middleware";
import LibraryRepository, {
  LibrarySkill,
  LibraryContentType,
} from "../repositories/library.repository";

const SKILLS: LibrarySkill[] = [
  "Reading",
  "Writing",
  "Listening",
  "Speaking",
  "Pronunciation",
];

function getUserId(req: AuthRequest): string | null {
  const sub = req.user?.sub;
  return typeof sub === "string" && sub.trim() ? sub : null;
}

export class LibraryController {
  static async listMyDocuments(req: AuthRequest, res: Response) {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "unauthorized" });

    const docs = await LibraryRepository.listDocumentsByUser(userId);

    const grouped: Record<string, any[]> = {
      Reading: [],
      Writing: [],
      Listening: [],
      Speaking: [],
      Pronunciation: [],
    };

    for (const d of docs) {
      const key = SKILLS.includes(d.skill as LibrarySkill)
        ? d.skill
        : "Reading";
      grouped[key] = grouped[key] || [];
      grouped[key].push({
        id: d.id,
        userId: d.userId,
        skill: d.skill,
        title: d.title,
        url: d.url || "",
        summary: d.summary || "",
        createdAt: d.createdAt ? new Date(d.createdAt) : new Date(),
      });
    }

    return res.json(grouped);
  }

  static async getMyDocument(req: AuthRequest, res: Response) {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "unauthorized" });

    const id = req.params.id;
    const doc = await LibraryRepository.getDocumentById(id, userId);
    if (!doc) return res.status(404).json({ error: "not found" });

    return res.json({
      id: doc.id,
      userId: doc.userId,
      skill: doc.skill,
      title: doc.title,
      url: doc.url || "",
      summary: doc.summary || "",
      createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
    });
  }

  static async createMyDocument(req: AuthRequest, res: Response) {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "unauthorized" });

    const { title, url, skill, summary } = req.body || {};
    if (!title || typeof title !== "string") {
      return res.status(400).json({ error: "title required" });
    }
    if (!skill || !SKILLS.includes(skill)) {
      return res.status(400).json({ error: "invalid skill" });
    }

    const created = await LibraryRepository.createDocument({
      id: uuidv4(),
      userId,
      title: title.trim(),
      url: typeof url === "string" ? url.trim() : null,
      skill,
      summary: typeof summary === "string" ? summary : "",
      sourceType: "manual",
    });

    return res.status(201).json({
      id: created.id,
      userId: created.userId,
      skill: created.skill,
      title: created.title,
      url: created.url || "",
      summary: created.summary || "",
      createdAt: created.createdAt ? new Date(created.createdAt) : new Date(),
    });
  }

  static async updateMyDocument(req: AuthRequest, res: Response) {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "unauthorized" });

    const id = req.params.id;
    const { title, url, skill, summary } = req.body || {};

    const updated = await LibraryRepository.updateDocument(id, userId, {
      title: typeof title === "string" ? title.trim() : undefined,
      url: typeof url === "string" ? url.trim() : undefined,
      skill: typeof skill === "string" ? (skill as LibrarySkill) : undefined,
      summary: typeof summary === "string" ? summary : undefined,
    });

    if (!updated) return res.status(404).json({ error: "not found" });

    return res.json({
      id: updated.id,
      userId: updated.userId,
      skill: updated.skill,
      title: updated.title,
      url: updated.url || "",
      summary: updated.summary || "",
      createdAt: updated.createdAt ? new Date(updated.createdAt) : new Date(),
    });
  }

  static async deleteMyDocument(req: AuthRequest, res: Response) {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "unauthorized" });

    const id = req.params.id;
    // idempotent delete
    await LibraryRepository.deleteDocument(id, userId);
    return res.json({ ok: true });
  }

  static async listMyContent(req: AuthRequest, res: Response) {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "unauthorized" });

    const docId = req.params.id;
    // ensure doc exists + owned
    const doc = await LibraryRepository.getDocumentById(docId, userId);
    if (!doc) return res.status(404).json({ error: "not found" });

    const content = await LibraryRepository.listContentsForDocument(
      docId,
      userId
    );
    return res.json(
      content.map((c) => ({
        id: c.id,
        docId: c.docId,
        userId: c.userId,
        fileName: c.fileName,
        type: c.type,
        content: c.content,
        createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
      }))
    );
  }

  static async addMyContent(req: AuthRequest, res: Response) {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "unauthorized" });

    const docId = req.params.id;
    const doc = await LibraryRepository.getDocumentById(docId, userId);
    if (!doc) return res.status(404).json({ error: "not found" });

    const { fileName, type, content } = req.body || {};
    if (!fileName || typeof fileName !== "string") {
      return res.status(400).json({ error: "fileName required" });
    }
    if (type !== "markdown" && type !== "image") {
      return res.status(400).json({ error: "invalid type" });
    }
    if (!content || typeof content !== "string") {
      return res.status(400).json({ error: "content required" });
    }

    const created = await LibraryRepository.createContent({
      id: uuidv4(),
      docId,
      userId,
      fileName: fileName.trim(),
      type: type as LibraryContentType,
      content,
    });

    return res.status(201).json({
      id: created.id,
      docId: created.docId,
      userId: created.userId,
      fileName: created.fileName,
      type: created.type,
      content: created.content,
      createdAt: created.createdAt ? new Date(created.createdAt) : new Date(),
    });
  }

  static async updateMyContent(req: AuthRequest, res: Response) {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "unauthorized" });

    const contentId = req.params.contentId;
    const { fileName, content } = req.body || {};

    const updated = await LibraryRepository.updateContent(contentId, userId, {
      fileName: typeof fileName === "string" ? fileName.trim() : undefined,
      content: typeof content === "string" ? content : undefined,
    });

    if (!updated) return res.status(404).json({ error: "not found" });

    return res.json({
      id: updated.id,
      docId: updated.docId,
      userId: updated.userId,
      fileName: updated.fileName,
      type: updated.type,
      content: updated.content,
      createdAt: updated.createdAt ? new Date(updated.createdAt) : new Date(),
    });
  }

  static async deleteMyContent(req: AuthRequest, res: Response) {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "unauthorized" });

    const contentId = req.params.contentId;
    await LibraryRepository.deleteContent(contentId, userId);
    return res.json({ ok: true });
  }

  static async getMyNotePage(req: AuthRequest, res: Response) {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "unauthorized" });

    const docId = req.params.id;
    const doc = await LibraryRepository.getDocumentById(docId, userId);
    if (!doc) return res.status(404).json({ error: "not found" });

    const supported = await LibraryRepository.isNotePageSupported();
    if (!supported) return res.json({ note: null });

    const note = await LibraryRepository.getNotePageForDocument(docId, userId);
    if (!note) return res.json({ note: null });

    return res.json({
      note: {
        id: note.id,
        docId: note.docId,
        userId: note.userId,
        fileName: note.fileName,
        type: note.type,
        content: note.content,
        isNotePage: true,
        createdAt: note.createdAt ? new Date(note.createdAt) : new Date(),
        updatedAt: note.updatedAt ? new Date(note.updatedAt) : new Date(),
      },
    });
  }

  static async upsertMyNotePage(req: AuthRequest, res: Response) {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "unauthorized" });

    const docId = req.params.id;
    const doc = await LibraryRepository.getDocumentById(docId, userId);
    if (!doc) return res.status(404).json({ error: "not found" });

    const supported = await LibraryRepository.isNotePageSupported();
    if (!supported) {
      return res.status(409).json({
        error: "note-page not supported",
        detail:
          "Database schema is missing dbo.LibraryContents.IsNotePage. Apply migration backend/db/migrations/20260109_add_library_note_page.sql (or update schema.sql) and retry.",
      });
    }

    const { fileName, content } = req.body || {};
    if (typeof content !== "string") {
      return res.status(400).json({ error: "content required" });
    }

    const existing = await LibraryRepository.getNotePageForDocument(
      docId,
      userId
    );
    if (existing) {
      const updated = await LibraryRepository.updateContent(
        existing.id,
        userId,
        {
          fileName:
            typeof fileName === "string" && fileName.trim()
              ? fileName.trim()
              : existing.fileName,
          content,
        }
      );

      if (!updated) return res.status(404).json({ error: "not found" });

      return res.json({
        note: {
          id: updated.id,
          docId: updated.docId,
          userId: updated.userId,
          fileName: updated.fileName,
          type: updated.type,
          content: updated.content,
          isNotePage: true,
          createdAt: updated.createdAt
            ? new Date(updated.createdAt)
            : new Date(),
          updatedAt: updated.updatedAt
            ? new Date(updated.updatedAt)
            : new Date(),
        },
      });
    }

    const created = await LibraryRepository.createContent({
      id: uuidv4(),
      docId,
      userId,
      fileName:
        typeof fileName === "string" && fileName.trim()
          ? fileName.trim()
          : "Note",
      type: "markdown",
      content,
      isNotePage: true,
    });

    return res.status(201).json({
      note: {
        id: created.id,
        docId: created.docId,
        userId: created.userId,
        fileName: created.fileName,
        type: created.type,
        content: created.content,
        isNotePage: true,
        createdAt: created.createdAt ? new Date(created.createdAt) : new Date(),
        updatedAt: created.updatedAt ? new Date(created.updatedAt) : new Date(),
      },
    });
  }
}

export default LibraryController;
