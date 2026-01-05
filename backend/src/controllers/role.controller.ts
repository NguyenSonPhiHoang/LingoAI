import { Request, Response } from "express";
import { RoleRepository } from "../repositories/role.repository";
import { v4 as uuid } from "uuid";

export class RoleController {
  // GET /api/roles
  static async list(req: Request, res: Response) {
    try {
      const roles = await RoleRepository.findAll();
      res.json(roles);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // GET /api/roles/:id
  static async getById(req: Request, res: Response) {
    try {
      const role = await RoleRepository.findById(req.params.id);
      if (!role) return res.status(404).json({ error: "role not found" });
      res.json(role);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // POST /api/roles
  static async create(req: Request, res: Response) {
    try {
      const { name, description } = req.body;
      if (!name) return res.status(400).json({ error: "name required" });
      const existing = await RoleRepository.findByName(name);
      if (existing) return res.status(409).json({ error: "role name exists" });
      const id = `role_${uuid().substring(0, 8)}`;
      const role = await RoleRepository.create(id, name, description);
      res.status(201).json(role);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // PUT /api/roles/:id
  static async update(req: Request, res: Response) {
    try {
      const { name, description } = req.body;
      if (!name) return res.status(400).json({ error: "name required" });
      await RoleRepository.update(req.params.id, name, description);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  // DELETE /api/roles/:id
  static async delete(req: Request, res: Response) {
    try {
      await RoleRepository.delete(req.params.id);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
