import { Response } from "express";
import type { AuthRequest } from "../middleware/auth.middleware";
import fs from "fs";
import path from "path";
import * as pdfParse from "pdf-parse";
import VtepRepository from "../repositories/vtep.repository";

function getUserId(req: AuthRequest): string | null {
  const sub = req.user?.sub;
  return typeof sub === "string" && sub.trim() ? sub : null;
}

export class VtepController {
  static async uploadPdf(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "unauthorized" });

      const file = (req as any).file;
      if (!file) {
        console.warn("VTEP upload: no file found on request", {
          body: req.body,
        });
        return res.status(400).json({ error: "file required" });
      }

      const uploadsRoot = path.join(__dirname, "..", "..", "uploads", "vtep");
      fs.mkdirSync(uploadsRoot, { recursive: true });

      const destPath = path.join(uploadsRoot, file.filename);
      // file is already saved by multer to a temp path
      try {
        fs.renameSync(file.path, destPath);
      } catch (moveErr: any) {
        console.error("Failed to move uploaded file", moveErr, {
          tmpPath: file.path,
          destPath,
        });
        return res.status(500).json({
          error: "failed to store uploaded file",
          detail: String(moveErr.message || moveErr),
        });
      }

      // read file and extract text per page
      let parsed: any = null;
      try {
        // diagnostic: file size and header bytes
        try {
          const stat = fs.statSync(destPath);
          console.info("VTEP: uploaded file size", {
            size: stat.size,
            destPath,
          });
          const fd = fs.openSync(destPath, "r");
          const header = Buffer.alloc(8);
          fs.readSync(fd, header, 0, 8, 0);
          fs.closeSync(fd);
          const headerStr = header.toString("utf8");
          console.info("VTEP: file header (utf8)", {
            headerStr,
            headerHex: header.toString("hex"),
          });
          if (!headerStr.includes("%PDF")) {
            console.warn(
              "VTEP: uploaded file does not look like a PDF (missing %PDF header)",
              { headerStr },
            );
          }
        } catch (diagErr: any) {
          console.warn("VTEP: failed to read file diagnostics", diagErr);
        }

        const dataBuffer = fs.readFileSync(destPath);
        // pdf-parse exports a CommonJS callable; cast to any to call safely
        parsed = await (pdfParse as any)(dataBuffer, { max: 0 });
      } catch (parseErr: any) {
        console.error("PDF parse failed", parseErr);
        return res.status(500).json({
          error: "failed to parse pdf",
          detail: String(parseErr.message || parseErr),
        });
      }

      const text = parsed?.text || "";
      const pageCount = parsed?.numpages || null;

      // simple split by form-feed or newline heuristics (pdf-parse gives whole text)
      // We'll keep whole text and let admin split via UI; store pageCount

      let toc = null;
      try {
        toc = req.body.toc ? JSON.parse(String(req.body.toc)) : null;
      } catch (tocErr: any) {
        console.warn("Invalid toc JSON provided", tocErr);
        toc = null;
      }

      const doc = await VtepRepository.createDocument({
        title: req.body.title || file.originalname,
        description: req.body.description || null,
        fileName: file.originalname,
        filePath: `/uploads/vtep/${file.filename}`,
        pageCount,
        tocJson: toc,
        createdByUserId: userId,
      });

      return res.json({
        id: doc.id,
        filePath: `/uploads/vtep/${file.filename}`,
        pageCount,
        textPreview: (text || "").slice(0, 2000),
      });
    } catch (err: any) {
      console.error("VTEP upload error:", err?.message || err, {
        stack: err?.stack,
      });
      return res.status(500).json({
        error: "failed to upload pdf",
        detail: String(err?.message || err),
      });
    }
  }

  static async uploadAudio(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "unauthorized" });

      const documentId = req.params.id;
      if (!documentId)
        return res.status(400).json({ error: "document id required" });

      const file = (req as any).file;
      if (!file) return res.status(400).json({ error: "file required" });

      const uploadsRoot = path.join(
        __dirname,
        "..",
        "..",
        "uploads",
        "vtep",
        "audio",
      );
      fs.mkdirSync(uploadsRoot, { recursive: true });

      const destPath = path.join(uploadsRoot, file.filename);
      try {
        fs.renameSync(file.path, destPath);
      } catch (moveErr: any) {
        console.error("Failed to move uploaded audio file", moveErr, {
          tmpPath: file.path,
          destPath,
        });
        return res.status(500).json({ error: "failed to store uploaded file" });
      }

      const webPath = `/uploads/vtep/audio/${file.filename}`;
      try {
        await VtepRepository.setDocumentAudio(documentId, webPath);
      } catch (repoErr: any) {
        console.error("Failed to set document audio path", repoErr);
        return res
          .status(500)
          .json({ error: "failed to update document audio" });
      }

      const doc = await VtepRepository.getDocument(documentId);
      return res.json({ document: doc, audioPath: webPath });
    } catch (err: any) {
      console.error("VTEP uploadAudio error:", err?.message || err, {
        stack: err?.stack,
      });
      return res.status(500).json({ error: "failed to upload audio" });
    }
  }

  static async listDocuments(req: AuthRequest, res: Response) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const search = req.query.search as string | undefined;
      const skill = req.query.skill as string | undefined;

      const result = await VtepRepository.listDocuments({ page, limit, search, skill });
      return res.json(result);
    } catch (err: any) {
      console.error("VTEP list error:", err?.message || err);
      return res.status(500).json({ error: "failed to list documents" });
    }
  }

  // Public listing for authenticated (student) users
  static async listDocumentsPublic(req: AuthRequest, res: Response) {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const search = req.query.search as string | undefined;
      const skill = req.query.skill as string | undefined;

      const result = await VtepRepository.listDocuments({ page, limit, search, skill });
      return res.json(result);
    } catch (err: any) {
      console.error("VTEP public list error:", err?.message || err);
      return res.status(500).json({ error: "failed to list documents" });
    }
  }

  static async createDocumentManual(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "unauthorized" });

      const { title, description, tocJson, skill } = req.body;

      let nextToc: any = null;
      if (tocJson && typeof tocJson === "object") {
        nextToc = tocJson;
      } else if (typeof skill === "string" && skill.trim()) {
        nextToc = { skill: skill.trim() };
      }

      const doc = await VtepRepository.createDocument({
        title: title || null,
        description: description || null,
        fileName: title || "manual",
        filePath: null as any,
        pageCount: null,
        tocJson: nextToc,
        createdByUserId: userId,
      });

      return res.json({ id: doc.id });
    } catch (err: any) {
      console.error("VTEP createDocumentManual error:", err?.message || err);
      return res.status(500).json({ error: "failed to create document" });
    }
  }

  static async createItemsForDocument(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "unauthorized" });

      const documentId = req.params.id;
      if (!documentId)
        return res.status(400).json({ error: "document id required" });

      const items = req.body.items;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "items array required" });
      }

      // Keep item order stable for this request by assigning a deterministic
      // per-item SectionKey if the client didn't provide one.
      const batchKey = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const prepared = items.map((it: any, idx: number) => ({
        documentId,
        sectionKey:
          (it.sectionKey ?? null) || `${batchKey}:${String(idx).padStart(4, "0")}`,
        skill: (it.skill ?? null) || "Listening",
        part: it.part ?? null,
        prompt: it.prompt ?? null,
        optionsJson:
          typeof it.optionsJson === "undefined" ? null : it.optionsJson,
        answerJson: typeof it.answerJson === "undefined" ? null : it.answerJson,
        mediaUrl: it.mediaUrl ?? null,
        difficulty: typeof it.difficulty === "number" ? it.difficulty : null,
        createdByUserId: userId,
      }));

      await VtepRepository.createItems(prepared);
      return res.json({ ok: true });
    } catch (err: any) {
      console.error("VTEP createItemsForDocument error:", err?.message || err);
      return res.status(500).json({ error: "failed to create items" });
    }
  }

  static async getDocument(req: AuthRequest, res: Response) {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: "id required" });
    try {
      const doc = await VtepRepository.getDocument(id);
      if (!doc) return res.status(404).json({ error: "not found" });
      return res.json({ document: doc });
    } catch (err: any) {
      console.error("VTEP get error:", err?.message || err);
      return res.status(500).json({ error: "failed to get document" });
    }
  }

  static async getDocumentPublic(req: AuthRequest, res: Response) {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: "id required" });
    try {
      const doc = await VtepRepository.getDocument(id);
      if (!doc) return res.status(404).json({ error: "not found" });
      return res.json({ document: doc });
    } catch (err: any) {
      console.error("VTEP getDocumentPublic error:", err?.message || err);
      return res.status(500).json({ error: "failed to get document" });
    }
  }

  static async listItems(req: AuthRequest, res: Response) {
    try {
      const id = req.params.id;
      if (!id) return res.status(400).json({ error: "id required" });
      
      console.log(`🔍 VTEP listItems called for document: ${id}`);
      const items = await VtepRepository.listItemsForDocument(id);
      
      console.log(`✅ VTEP listItems returning ${items.length} items`);
      items.forEach((item, index) => {
        console.log(`Item ${index + 1}: ID=${item.id}, Prompt length=${item.prompt?.length || 0}`);
      });
      
      return res.json({ items });
    } catch (err: any) {
      console.error("VTEP listItems error:", err?.message || err);
      return res.status(500).json({ error: "failed to list items" });
    }
  }

  // Public items listing for authenticated (student) users
  static async listItemsPublic(req: AuthRequest, res: Response) {
    try {
      const id = req.params.id;
      if (!id) return res.status(400).json({ error: "id required" });
      
      console.log(`🔍 VTEP listItemsPublic called for document: ${id}`);
      const items = await VtepRepository.listItemsForDocument(id);
      
      console.log(`✅ VTEP listItemsPublic returning ${items.length} items`);
      items.forEach((item, index) => {
        console.log(`Public Item ${index + 1}: ID=${item.id}, Prompt length=${item.prompt?.length || 0}`);
      });
      
      return res.json({ items });
    } catch (err: any) {
      console.error("VTEP listItemsPublic error:", err?.message || err);
      return res.status(500).json({ error: "failed to list items" });
    }
  }

  static async updateItem(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "unauthorized" });

      const itemId = req.params.itemId;
      if (!itemId) return res.status(400).json({ error: "item id required" });

      const {
        sectionKey,
        skill,
        part,
        prompt,
        optionsJson,
        answerJson,
        mediaUrl,
        difficulty,
      } = req.body;

      await VtepRepository.updateItem(itemId, {
        sectionKey: sectionKey ?? null,
        skill: skill ?? null,
        part: part ?? null,
        prompt: prompt ?? null,
        optionsJson: typeof optionsJson === "undefined" ? null : optionsJson,
        answerJson: typeof answerJson === "undefined" ? null : answerJson,
        mediaUrl: mediaUrl ?? null,
        difficulty: typeof difficulty === "number" ? difficulty : null,
      });

      return res.json({ id: itemId });
    } catch (err: any) {
      console.error("VTEP updateItem error:", err?.message || err);
      return res.status(500).json({ error: "failed to update item" });
    }
  }

  static async deleteItem(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "unauthorized" });

      const itemId = req.params.itemId;
      if (!itemId) return res.status(400).json({ error: "item id required" });

      await VtepRepository.deleteItem(itemId);
      return res.json({ id: itemId });
    } catch (err: any) {
      console.error("VTEP deleteItem error:", err?.message || err);
      return res.status(500).json({ error: "failed to delete item" });
    }
  }

  static async updateDocument(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "unauthorized" });

      const id = req.params.id;
      if (!id) return res.status(400).json({ error: "id required" });

      const { title, description, tocJson } = req.body;
      await VtepRepository.updateDocument(id, {
        title: typeof title === "undefined" ? undefined : title ?? null,
        description:
          typeof description === "undefined" ? undefined : description ?? null,
        tocJson: typeof tocJson === "undefined" ? undefined : tocJson,
      });
      return res.json({ id });
    } catch (err: any) {
      console.error("VTEP update error:", err?.message || err);
      return res.status(500).json({ error: "failed to update document" });
    }
  }

  static async deleteDocument(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "unauthorized" });

      const id = req.params.id;
      if (!id) return res.status(400).json({ error: "id required" });

      await VtepRepository.deleteDocument(id);
      return res.json({ id });
    } catch (err: any) {
      console.error("VTEP delete error:", err?.message || err);
      return res.status(500).json({ error: "failed to delete document" });
    }
  }
}

export default VtepController;
