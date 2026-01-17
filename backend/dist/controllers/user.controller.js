"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const user_repository_1 = require("../repositories/user.repository");
class UserController {
    static async list(req, res) {
        const users = await user_repository_1.UserRepository.findAll();
        res.json(users);
    }
    static async ensureTable(req, res) {
        res.json({ ok: true });
    }
    // Admin: list users with search, filter, sort, pagination
    static async adminList(req, res) {
        try {
            const q = req.query.q || "";
            const roleId = req.query.roleId || "";
            const status = req.query.status || "";
            const sortBy = req.query.sortBy || "createdAt";
            const sortDir = req.query.sortDir === "asc" ? "asc" : "desc";
            const page = parseInt(req.query.page || "1", 10) || 1;
            const pageSize = Math.min(parseInt(req.query.pageSize || "20", 10) || 20, 200);
            const all = await user_repository_1.UserRepository.findAll();
            // Filter
            let filtered = all.filter((u) => {
                const email = (u.Email || u.email || "").toLowerCase();
                const displayName = (u.DisplayName ||
                    u.displayName ||
                    "").toLowerCase();
                const idVal = (u.Id || u.id || "").toLowerCase();
                if (q) {
                    const s = q.toLowerCase();
                    const match = email.includes(s) || displayName.includes(s) || idVal.includes(s);
                    if (!match)
                        return false;
                }
                const roleVal = u.RoleId || u.roleId;
                const statusVal = u.Status || u.status || "";
                if (roleId && roleVal !== roleId)
                    return false;
                if (status && statusVal !== status)
                    return false;
                return true;
            });
            // Sort
            filtered.sort((a, b) => {
                const av = a[sortBy] || "";
                const bv = b[sortBy] || "";
                if (av === bv)
                    return 0;
                if (sortDir === "asc")
                    return av > bv ? 1 : -1;
                return av > bv ? -1 : 1;
            });
            const total = filtered.length;
            const start = (page - 1) * pageSize;
            const pageItems = filtered.slice(start, start + pageSize);
            res.json({ items: pageItems, total, page, pageSize });
        }
        catch (err) {
            console.error("Admin list users error:", err);
            res.status(500).json({ error: err.message || "Failed to list users" });
        }
    }
    static async adminGet(req, res) {
        try {
            const { id } = req.params;
            const user = await user_repository_1.UserRepository.findById(id);
            if (!user)
                return res.status(404).json({ error: "not found" });
            res.json(user);
        }
        catch (err) {
            console.error("Admin get user error:", err);
            res.status(500).json({ error: err.message || "Failed to get user" });
        }
    }
    static async adminCreate(req, res) {
        try {
            const { id, email, displayName, password, roleId, status, omniChatEnabled, } = req.body || {};
            if (!id || !email || !password)
                return res.status(400).json({ error: "id, email, password required" });
            const existing = await user_repository_1.UserRepository.findByEmail(email);
            if (existing)
                return res.status(409).json({ error: "email already exists" });
            await user_repository_1.UserRepository.createUser(id, email, displayName || null, password, roleId || "role_student", status || "pending", typeof omniChatEnabled === "boolean" ? omniChatEnabled : true);
            const created = await user_repository_1.UserRepository.findById(id);
            res.status(201).json(created);
        }
        catch (err) {
            console.error("Admin create user error:", err);
            res.status(500).json({ error: err.message || "Failed to create user" });
        }
    }
    static async adminUpdate(req, res) {
        try {
            const { id } = req.params;
            const { email, displayName, password, roleId, status, omniChatEnabled } = req.body || {};
            const existing = await user_repository_1.UserRepository.findById(id);
            if (!existing)
                return res.status(404).json({ error: "not found" });
            await user_repository_1.UserRepository.update(id, email || existing.Email, displayName || existing.DisplayName, password || null, roleId || existing.RoleId, status || existing.Status || "pending", typeof omniChatEnabled === "boolean"
                ? omniChatEnabled
                : existing.OmniChatEnabled === undefined
                    ? true
                    : existing.OmniChatEnabled);
            const updated = await user_repository_1.UserRepository.findById(id);
            res.json(updated);
        }
        catch (err) {
            console.error("Admin update user error:", err);
            res.status(500).json({ error: err.message || "Failed to update user" });
        }
    }
    static async adminDelete(req, res) {
        try {
            const { id } = req.params;
            await user_repository_1.UserRepository.delete(id);
            res.json({ ok: true });
        }
        catch (err) {
            console.error("Admin delete user error:", err);
            res.status(500).json({ error: err.message || "Failed to delete user" });
        }
    }
}
exports.UserController = UserController;
