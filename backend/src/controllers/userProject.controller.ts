import { Request, Response } from "express";
import UserProjectRepository from "../repositories/userProject.repository";
import { v4 as uuidv4 } from "uuid";

export class UserProjectController {
  static async list(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user || !user.sub)
        return res.status(401).json({ error: "unauthorized" });
      const projects = await UserProjectRepository.listByUser(user.sub);
      res.json(projects);
    } catch (err: any) {
      console.error("List projects error:", err);
      res.status(500).json({ error: err.message || "Failed to list projects" });
    }
  }

  static async get(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user || !user.sub)
        return res.status(401).json({ error: "unauthorized" });
      const { id } = req.params;
      const project = await UserProjectRepository.getById(id, user.sub);
      if (!project) return res.status(404).json({ error: "not found" });
      res.json(project);
    } catch (err: any) {
      console.error("Get project error:", err);
      res.status(500).json({ error: err.message || "Failed to get project" });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user || !user.sub)
        return res.status(401).json({ error: "unauthorized" });
      const { name, description, data } = req.body || {};
      if (!name) return res.status(400).json({ error: "name required" });
      const id = `proj_${uuidv4()}`;
      const now = new Date();
      const project = {
        Id: id,
        UserId: user.sub,
        Name: name,
        Description: description || null,
        Data: data ? JSON.stringify(data) : null,
        CreatedAt: now,
        UpdatedAt: now,
      };
      await UserProjectRepository.create(project);
      res.status(201).json(project);
    } catch (err: any) {
      console.error("Create project error:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to create project" });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user || !user.sub)
        return res.status(401).json({ error: "unauthorized" });
      const { id } = req.params;
      const existing = await UserProjectRepository.getById(id, user.sub);
      if (!existing) return res.status(404).json({ error: "not found" });
      const { name, description, data } = req.body || {};
      if (!name) return res.status(400).json({ error: "name required" });
      const project = {
        Id: id,
        UserId: user.sub,
        Name: name,
        Description: description || null,
        Data: data ? JSON.stringify(data) : null,
        CreatedAt: existing.CreatedAt,
        UpdatedAt: new Date(),
      };
      await UserProjectRepository.update(project);
      res.json(project);
    } catch (err: any) {
      console.error("Update project error:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to update project" });
    }
  }

  static async remove(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user || !user.sub)
        return res.status(401).json({ error: "unauthorized" });
      const { id } = req.params;
      await UserProjectRepository.delete(id, user.sub);
      res.json({ ok: true });
    } catch (err: any) {
      console.error("Delete project error:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to delete project" });
    }
  }
}

export default UserProjectController;
