import { Request, Response } from "express";
import { UserRepository } from "../repositories/user.repository";
import UserSettingsRepository from "../repositories/userSettings.repository";

export class UserController {
  static async list(req: Request, res: Response) {
    const users = await UserRepository.findAll();
    res.json(users);
  }

  static async ensureTable(req: Request, res: Response) {
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
        200,
      );

      const all = await UserRepository.findAll();

      // Filter
      let filtered = all.filter((u: any) => {
        const email = (u.Email || u.email || "").toLowerCase();
        const displayName = (
          u.DisplayName ||
          u.displayName ||
          ""
        ).toLowerCase();
        const idVal = (u.Id || u.id || "").toLowerCase();
        if (q) {
          const s = q.toLowerCase();
          const match =
            email.includes(s) || displayName.includes(s) || idVal.includes(s);
          if (!match) return false;
        }
        const roleVal = u.RoleId || u.roleId;
        const statusVal = u.Status || u.status || "";
        if (roleId && roleVal !== roleId) return false;
        if (status && statusVal !== status) return false;
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

      // Enrich page items with user settings (allowGeminiApiKey)
      const enriched = await Promise.all(
        pageItems.map(async (u: any) => {
          try {
            const settingsRow = await UserSettingsRepository.getByUserId(
              u.Id || u.id,
            );
            const settings =
              settingsRow && settingsRow.Settings
                ? JSON.parse(settingsRow.Settings)
                : {};
            // Prefer explicit DB column `AllowGemini` if present, otherwise
            // fall back to JSON `allowGeminiApiKey` for backward compatibility.
            const allowFromColumn =
              settingsRow && settingsRow.AllowGemini !== undefined
                ? settingsRow.AllowGemini === 1 ||
                  settingsRow.AllowGemini === true
                : undefined;
            const allowFromJson = !!settings.allowGeminiApiKey;
            const allow =
              allowFromColumn === undefined ? allowFromJson : !!allowFromColumn;
            return { ...u, allowGeminiApiKey: allow };
          } catch (err) {
            return { ...u, allowGeminiApiKey: false };
          }
        }),
      );

      res.json({ items: enriched, total, page, pageSize });
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
      // Attach user settings (allowGeminiApiKey)
      try {
        const settingsRow = await UserSettingsRepository.getByUserId(id);
        const settings =
          settingsRow && settingsRow.Settings
            ? JSON.parse(settingsRow.Settings)
            : {};
        return res.json({
          ...user,
          allowGeminiApiKey: !!settings.allowGeminiApiKey,
        });
      } catch (err) {
        return res.json({ ...user, allowGeminiApiKey: false });
      }
    } catch (err: any) {
      console.error("Admin get user error:", err);
      res.status(500).json({ error: err.message || "Failed to get user" });
    }
  }

  static async adminCreate(req: Request, res: Response) {
    try {
      const {
        id,
        email,
        displayName,
        password,
        roleId,
        status,
        omniChatEnabled,
      } = req.body || {};
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
        status || "pending",
        typeof omniChatEnabled === "boolean" ? omniChatEnabled : true,
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
      const { email, displayName, password, roleId, status, omniChatEnabled } =
        req.body || {};
      const existing = await UserRepository.findById(id);
      if (!existing) return res.status(404).json({ error: "not found" });
      await UserRepository.update(
        id,
        email || existing.Email,
        displayName || existing.DisplayName,
        password || null,
        roleId || existing.RoleId,
        status || existing.Status || "pending",
        typeof omniChatEnabled === "boolean"
          ? omniChatEnabled
          : existing.OmniChatEnabled === undefined
            ? true
            : existing.OmniChatEnabled,
      );
      const updated = await UserRepository.findById(id);
      res.json(updated);
    } catch (err: any) {
      console.error("Admin update user error:", err);
      res.status(500).json({ error: err.message || "Failed to update user" });
    }
  }

  static async adminUpdateGeminiApiKey(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { geminiApiKey } = req.body || {};
      const existing = await UserRepository.findById(id);
      if (!existing) return res.status(404).json({ error: "not found" });

      // Load current settings (if any), update geminiApiKey field
      const dbRow = await UserSettingsRepository.getByUserId(id);
      const settings =
        dbRow && dbRow.Settings ? JSON.parse(dbRow.Settings) : {};
      settings.geminiApiKey = geminiApiKey || null;
      const json = JSON.stringify(settings);

      try {
        const existingAllowRaw = dbRow?.AllowGemini;
        const existingAllow =
          existingAllowRaw === undefined || existingAllowRaw === null
            ? null
            : !!existingAllowRaw;
        await UserSettingsRepository.upsert(
          id,
          json,
          geminiApiKey || null,
          existingAllow,
        );
      } catch (err) {
        console.error("Failed to upsert user settings for gemini key:", err);
        return res.status(500).json({ error: "Failed to persist gemini key" });
      }

      const savedRow = await UserSettingsRepository.getByUserId(id);
      const saved =
        savedRow && savedRow.Settings ? JSON.parse(savedRow.Settings) : {};
      return res.json({
        ok: true,
        saved,
        geminiApiKey: savedRow?.GeminiApiKey || null,
        updatedAt: savedRow?.UpdatedAt,
      });
    } catch (err: any) {
      console.error("Admin update gemini api key error:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to update gemini api key" });
    }
  }

  static async adminSetAllowGemini(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { allow } = req.body || {};
      const existing = await UserRepository.findById(id);
      if (!existing) return res.status(404).json({ error: "not found" });

      const dbRow = await UserSettingsRepository.getByUserId(id);
      const settings =
        dbRow && dbRow.Settings ? JSON.parse(dbRow.Settings) : {};
      settings.allowGeminiApiKey = !!allow;
      const json = JSON.stringify(settings);

      try {
        await UserSettingsRepository.upsert(
          id,
          json,
          dbRow?.GeminiApiKey || null,
          !!allow,
        );
      } catch (err) {
        console.error("Failed to upsert user settings for allowGemini:", err);
        return res.status(500).json({ error: "Failed to persist setting" });
      }

      const savedRow = await UserSettingsRepository.getByUserId(id);
      const saved =
        savedRow && savedRow.Settings ? JSON.parse(savedRow.Settings) : {};
      return res.json({
        ok: true,
        allowGeminiApiKey: !!saved.allowGeminiApiKey,
        updatedAt: savedRow?.UpdatedAt,
      });
    } catch (err: any) {
      console.error("Admin set allow gemini error:", err);
      res
        .status(500)
        .json({ error: err.message || "Failed to set allow gemini" });
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
