"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
exports.authenticateJWT = authenticateJWT;
exports.authorizeRoles = authorizeRoles;
exports.requireRole = requireRole;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const role_repository_1 = require("../repositories/role.repository");
function authenticateJWT(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer "))
        return res.status(401).json({ error: "unauthorized" });
    const token = auth.substring(7);
    try {
        const payload = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
        req.user = payload;
        next();
    }
    catch (err) {
        // Log verification error for debugging
        console.error("JWT verification failed:", err && err.message ? err.message : err);
        return res.status(401).json({ error: "invalid token" });
    }
}
// Alias for authenticateJWT
exports.requireAuth = authenticateJWT;
function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        const roleId = req.user?.roleId;
        if (!roleId)
            return res.status(403).json({ error: "forbidden" });
        // allowedRoles are role names or role ids; assume role ids passed like 'role_admin'
        if (allowedRoles.includes(roleId))
            return next();
        return res.status(403).json({ error: "forbidden" });
    };
}
// Middleware to check role by name (Admin, Teacher, Student)
function requireRole(...allowedRoleNames) {
    return async (req, res, next) => {
        const roleId = req.user?.roleId;
        if (!roleId)
            return res.status(403).json({ error: "forbidden - no role" });
        try {
            const role = await role_repository_1.RoleRepository.findById(roleId);
            if (!role)
                return res.status(403).json({ error: "forbidden - role not found" });
            // Check if user's role name is in allowed list (case insensitive)
            const userRoleName = role.name.toLowerCase();
            const allowed = allowedRoleNames.some((r) => r.toLowerCase() === userRoleName);
            if (allowed)
                return next();
            return res
                .status(403)
                .json({ error: "forbidden - insufficient permissions" });
        }
        catch (err) {
            console.error("Role check error:", err);
            return res.status(500).json({ error: "role check failed" });
        }
    };
}
