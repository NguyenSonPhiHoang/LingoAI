import { Request, Response } from "express";
import { TestRepository } from "../repositories/test.repository";
import { v4 as uuid } from "uuid";
import { AuthRequest } from "../middleware/auth.middleware";

export class TestController {
  // GET /api/tests/me
  static async listMyTests(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) return res.status(401).json({ error: "unauthorized" });
      const tests = await TestRepository.findByUser(userId);
      res.json(tests);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // GET /api/tests/user/:userId (admin/teacher)
  static async listByUser(req: Request, res: Response) {
    try {
      const tests = await TestRepository.findByUser(req.params.userId);
      res.json(tests);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // GET /api/tests/:id
  static async getById(req: Request, res: Response) {
    try {
      const test = await TestRepository.findById(req.params.id);
      if (!test) return res.status(404).json({ error: "test not found" });
      res.json(test);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // POST /api/tests
  static async create(req: AuthRequest, res: Response) {
    try {
      const { type, data, score } = req.body;
      const userId = req.user?.sub || null;
      const id = uuid();
      const test = await TestRepository.create({
        id,
        userId,
        type,
        data: typeof data === "string" ? data : JSON.stringify(data),
        score,
      });
      res.status(201).json(test);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // PUT /api/tests/:id
  static async update(req: Request, res: Response) {
    try {
      const { data, score } = req.body;
      await TestRepository.update({
        id: req.params.id,
        data: typeof data === "string" ? data : JSON.stringify(data),
        score,
      });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // DELETE /api/tests/:id
  static async delete(req: Request, res: Response) {
    try {
      await TestRepository.delete(req.params.id);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
