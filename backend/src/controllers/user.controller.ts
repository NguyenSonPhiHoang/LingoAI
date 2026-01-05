import { Request, Response } from "express";
import { UserRepository } from "../repositories/user.repository";

export class UserController {
  static async list(req: Request, res: Response) {
    const users = await UserRepository.findAll();
    res.json(users);
  }

  static async ensureTable(req: Request, res: Response) {
    await UserRepository.createTableIfNotExists();
    res.json({ ok: true });
  }

  // Admin: list users with search, filter, sort, pagination
  static async adminList(req: Request, res: Response) {
    try {
      const q = (req.query.q as string) || "";
      const roleId = (req.query.roleId as string) || "";
      const status = (req.query.status as string) || "";
      const sortBy = (req.query.sortBy as string) || "createdAt";
      const sortDir = (req.query.sortDir as string) === "asc" ? "asc" : "desc";
      const page = parseInt((req.query.page as string) || "1", 10) || 1;
      const pageSize = Math.min(
        parseInt((req.query.pageSize as string) || "20", 10) || 20,
        200
      );

      const all = await UserRepository.findAll();

      // Filter
      let filtered = all.filter((u: any) => {
        if (q) {
          const s = q.toLowerCase();
          const match =
            (u.Email || "").toLowerCase().includes(s) ||
            (u.DisplayName || "").toLowerCase().includes(s) ||
            (u.Id || "").toLowerCase().includes(s);
          if (!match) return false;
        }
        if (roleId && u.RoleId !== roleId) return false;
        if (status && (u.Status || "") !== status) return false;
        return true;
      });

      // Sort
      filtered.sort((a: any, b: any) => {
        const av = a[sortBy] || "";
        const bv = b[sortBy] || "";
        if (av === bv) return 0;
        if (sortDir === "asc") return av > bv ? 1 : -1;
        return av > bv ? -1 : 1;
      });

      const total = filtered.length;
      const start = (page - 1) * pageSize;
      const pageItems = filtered.slice(start, start + pageSize);

      res.json({ items: pageItems, total, page, pageSize });
    } catch (err: any) {
      console.error("Admin list users error:", err);
      res.status(500).json({ error: err.message || "Failed to list users" });
    }
  }

  static async adminGet(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = await UserRepository.findById(id);
      if (!user) return res.status(404).json({ error: "not found" });
      res.json(user);
    } catch (err: any) {
      console.error("Admin get user error:", err);
      res.status(500).json({ error: err.message || "Failed to get user" });
    }
  }

  static async adminCreate(req: Request, res: Response) {
    try {
      const { id, email, displayName, password, roleId, status } =
        req.body || {};
      if (!id || !email || !password)
        return res.status(400).json({ error: "id, email, password required" });
      const existing = await UserRepository.findByEmail(email);
      if (existing)
        return res.status(409).json({ error: "email already exists" });
      await UserRepository.createUser(
        id,
        email,
        displayName || null,
        password,
        roleId || "role_student",
        status || "pending"
      );
      const created = await UserRepository.findById(id);
      res.status(201).json(created);
    } catch (err: any) {
      console.error("Admin create user error:", err);
      res.status(500).json({ error: err.message || "Failed to create user" });
    }
  }

  static async adminUpdate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { email, displayName, password, roleId, status } = req.body || {};
      const existing = await UserRepository.findById(id);
      if (!existing) return res.status(404).json({ error: "not found" });
      await UserRepository.update(
        id,
        email || existing.Email,
        displayName || existing.DisplayName,
        password || null,
        roleId || existing.RoleId,
        status || existing.Status || "pending"
      );
      const updated = await UserRepository.findById(id);
      res.json(updated);
    } catch (err: any) {
      console.error("Admin update user error:", err);
      res.status(500).json({ error: err.message || "Failed to update user" });
    }
  }

  static async adminDelete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await UserRepository.delete(id);
      res.json({ ok: true });
    } catch (err: any) {
      console.error("Admin delete user error:", err);
      res.status(500).json({ error: err.message || "Failed to delete user" });
    }
  }
}
