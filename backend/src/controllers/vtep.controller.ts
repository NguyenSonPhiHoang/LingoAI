import { Response } from "express";
import type { AuthRequest } from "../middleware/auth.middleware";
import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";
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
        parsed = await pdfParse(dataBuffer, { max: 0 });
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

  static async listDocuments(req: AuthRequest, res: Response) {
    try {
      const rows = await VtepRepository.listDocuments();
      return res.json({ documents: rows });
    } catch (err: any) {
      console.error("VTEP list error:", err?.message || err);
      return res.status(500).json({ error: "failed to list documents" });
    }
  }

  static async createDocumentManual(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "unauthorized" });

      const { title, description } = req.body;

      const doc = await VtepRepository.createDocument({
        title: title || null,
        description: description || null,
        fileName: title || "manual",
        filePath: null as any,
        pageCount: null,
        tocJson: null,
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

      const prepared = items.map((it: any) => ({
        documentId,
        sectionKey: it.sectionKey ?? null,
        skill: it.skill ?? null,
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

  static async listItems(req: AuthRequest, res: Response) {
    try {
      const id = req.params.id;
      if (!id) return res.status(400).json({ error: "id required" });
      const items = await VtepRepository.listItemsForDocument(id);
      return res.json({ items });
    } catch (err: any) {
      console.error("VTEP listItems error:", err?.message || err);
      return res.status(500).json({ error: "failed to list items" });
    }
  }

  static async updateDocument(req: AuthRequest, res: Response) {
    try {
      const userId = getUserId(req);
      if (!userId) return res.status(401).json({ error: "unauthorized" });

      const id = req.params.id;
      if (!id) return res.status(400).json({ error: "id required" });

      const { title, description } = req.body;
      await VtepRepository.updateDocument(id, {
        title: title ?? null,
        description: description ?? null,
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
