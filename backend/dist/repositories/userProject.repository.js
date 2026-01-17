"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserProjectRepository = void 0;
const db_1 = require("../db");
class UserProjectRepository {
    static async create(project) {
        const pool = await (0, db_1.getPool)();
        await pool
            .request()
            .input("Id", project.Id)
            .input("UserId", project.UserId)
            .input("Name", project.Name)
            .input("Description", project.Description || null)
            .input("Data", project.Data || null)
            .input("CreatedAt", project.CreatedAt || new Date())
            .input("UpdatedAt", project.UpdatedAt || new Date())
            .execute("sp_UserProjects_Insert");
        return project;
    }
    static async update(project) {
        const pool = await (0, db_1.getPool)();
        await pool
            .request()
            .input("Id", project.Id)
            .input("UserId", project.UserId)
            .input("Name", project.Name)
            .input("Description", project.Description || null)
            .input("Data", project.Data || null)
            .input("UpdatedAt", project.UpdatedAt || new Date())
            .execute("sp_UserProjects_Update");
        return project;
    }
    static async delete(id, userId) {
        const pool = await (0, db_1.getPool)();
        await pool
            .request()
            .input("Id", id)
            .input("UserId", userId)
            .execute("sp_UserProjects_Delete");
    }
    static async getById(id, userId) {
        const pool = await (0, db_1.getPool)();
        const result = await pool
            .request()
            .input("Id", id)
            .input("UserId", userId)
            .execute("sp_UserProjects_GetById");
        return result.recordset && result.recordset.length
            ? result.recordset[0]
            : null;
    }
    static async listByUser(userId) {
        const pool = await (0, db_1.getPool)();
        const result = await pool
            .request()
            .input("UserId", userId)
            .execute("sp_UserProjects_ListByUser");
        return result.recordset || [];
    }
}
exports.UserProjectRepository = UserProjectRepository;
exports.default = UserProjectRepository;
