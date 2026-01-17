"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleController = void 0;
const role_repository_1 = require("../repositories/role.repository");
const uuid_1 = require("uuid");
class RoleController {
    // GET /api/roles
    static async list(req, res) {
        try {
            const roles = await role_repository_1.RoleRepository.findAll();
            res.json(roles);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // GET /api/roles/:id
    static async getById(req, res) {
        try {
            const role = await role_repository_1.RoleRepository.findById(req.params.id);
            if (!role)
                return res.status(404).json({ error: "role not found" });
            res.json(role);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // POST /api/roles
    static async create(req, res) {
        try {
            const { name, description } = req.body;
            if (!name)
                return res.status(400).json({ error: "name required" });
            const existing = await role_repository_1.RoleRepository.findByName(name);
            if (existing)
                return res.status(409).json({ error: "role name exists" });
            const id = `role_${(0, uuid_1.v4)().substring(0, 8)}`;
            const role = await role_repository_1.RoleRepository.create(id, name, description);
            res.status(201).json(role);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // PUT /api/roles/:id
    static async update(req, res) {
        try {
            const { name, description } = req.body;
            if (!name)
                return res.status(400).json({ error: "name required" });
            await role_repository_1.RoleRepository.update(req.params.id, name, description);
            res.json({ ok: true });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    // DELETE /api/roles/:id
    static async delete(req, res) {
        try {
            await role_repository_1.RoleRepository.delete(req.params.id);
            res.json({ ok: true });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}
exports.RoleController = RoleController;
