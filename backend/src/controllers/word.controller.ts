import { Request, Response } from "express";
import { WordRepository } from "../repositories/word.repository";

export class WordController {
  // GET /api/words
  static async list(req: Request, res: Response) {
    try {
      const words = await WordRepository.findAll();
      res.json(words);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // PUT /api/words/:id
  static async update(req: Request, res: Response) {
    try {
      const { term, pronunciation, audioUrl } = req.body || {};
      const id = req.params.id;
      if (!id) return res.status(400).json({ error: "id required" });

      let term_normalized: string | null | undefined = undefined;
      if (typeof term === "string") {
        term_normalized = term.trim().toLowerCase();
      }

      await WordRepository.update({
        id,
        term: typeof term === "string" ? term : null,
        term_normalized: term_normalized ?? null,
        pronunciation: typeof pronunciation === "string" ? pronunciation : null,
        audioUrl: typeof audioUrl === "string" ? audioUrl : null,
      });

      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
