"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserProjectController = void 0;
const userProject_repository_1 = __importDefault(require("../repositories/userProject.repository"));
const uuid_1 = require("uuid");
class UserProjectController {
    static async list(req, res) {
        try {
            const user = req.user;
            if (!user || !user.sub)
                return res.status(401).json({ error: "unauthorized" });
            const projects = await userProject_repository_1.default.listByUser(user.sub);
            res.json(projects);
        }
        catch (err) {
            console.error("List projects error:", err);
            res.status(500).json({ error: err.message || "Failed to list projects" });
        }
    }
    static async get(req, res) {
        try {
            const user = req.user;
            if (!user || !user.sub)
                return res.status(401).json({ error: "unauthorized" });
            const { id } = req.params;
            const project = await userProject_repository_1.default.getById(id, user.sub);
            if (!project)
                return res.status(404).json({ error: "not found" });
            res.json(project);
        }
        catch (err) {
            console.error("Get project error:", err);
            res.status(500).json({ error: err.message || "Failed to get project" });
        }
    }
    static async create(req, res) {
        try {
            const user = req.user;
            if (!user || !user.sub)
                return res.status(401).json({ error: "unauthorized" });
            const { name, description, data } = req.body || {};
            if (!name)
                return res.status(400).json({ error: "name required" });
            const id = `proj_${(0, uuid_1.v4)()}`;
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
            await userProject_repository_1.default.create(project);
            res.status(201).json(project);
        }
        catch (err) {
            console.error("Create project error:", err);
            res
                .status(500)
                .json({ error: err.message || "Failed to create project" });
        }
    }
    static async update(req, res) {
        try {
            const user = req.user;
            if (!user || !user.sub)
                return res.status(401).json({ error: "unauthorized" });
            const { id } = req.params;
            const existing = await userProject_repository_1.default.getById(id, user.sub);
            if (!existing)
                return res.status(404).json({ error: "not found" });
            const { name, description, data } = req.body || {};
            if (!name)
                return res.status(400).json({ error: "name required" });
            const project = {
                Id: id,
                UserId: user.sub,
                Name: name,
                Description: description || null,
                Data: data ? JSON.stringify(data) : null,
                CreatedAt: existing.CreatedAt,
                UpdatedAt: new Date(),
            };
            await userProject_repository_1.default.update(project);
            res.json(project);
        }
        catch (err) {
            console.error("Update project error:", err);
            res
                .status(500)
                .json({ error: err.message || "Failed to update project" });
        }
    }
    static async remove(req, res) {
        try {
            const user = req.user;
            if (!user || !user.sub)
                return res.status(401).json({ error: "unauthorized" });
            const { id } = req.params;
            await userProject_repository_1.default.delete(id, user.sub);
            res.json({ ok: true });
        }
        catch (err) {
            console.error("Delete project error:", err);
            res
                .status(500)
                .json({ error: err.message || "Failed to delete project" });
        }
    }
}
exports.UserProjectController = UserProjectController;
exports.default = UserProjectController;
