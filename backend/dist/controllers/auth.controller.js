"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const user_repository_1 = require("../repositories/user.repository");
const role_repository_1 = require("../repositories/role.repository");
const userProfile_repository_1 = __importDefault(require("../repositories/userProfile.repository"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
class AuthController {
    static async register(req, res) {
        try {
            const { id, email, displayName, password, roleId } = req.body;
            if (!id || !email || !password)
                return res.status(400).json({ error: "id, email, password required" });
            const existing = await user_repository_1.UserRepository.findByEmail(email);
            if (existing)
                return res.status(409).json({ error: "email already exists" });
            const user = await user_repository_1.UserRepository.createUser(id, email, displayName || null, password, roleId || "role_student");
            res.json({ ok: true, user });
        }
        catch (error) {
            console.error("Register error:", error);
            res.status(500).json({ error: error.message || "Registration failed" });
        }
    }
    static async login(req, res) {
        try {
            const { emailOrId, password } = req.body;
            if (!emailOrId || !password)
                return res
                    .status(400)
                    .json({ error: "emailOrId and password required" });
            const ok = await user_repository_1.UserRepository.verifyPassword(emailOrId, password);
            if (!ok)
                return res.status(401).json({ error: "invalid credentials" });
            const user = (await user_repository_1.UserRepository.findByEmail(emailOrId)) ||
                (await user_repository_1.UserRepository.findById(emailOrId));
            if (!user)
                return res.status(401).json({ error: "User not found" });
            const status = (user.Status || user.status || "").toLowerCase();
            if (status !== "approved")
                return res.status(403).json({ error: "account not approved" });
            const payload = {
                sub: user.Id,
                email: user.Email,
                roleId: user.RoleId,
                displayName: user.DisplayName,
            };
            const token = jsonwebtoken_1.default.sign(payload, config_1.config.jwtSecret, { expiresIn: "7d" });
            res.json({ token });
        }
        catch (error) {
            console.error("Login error:", error);
            res.status(500).json({ error: error.message || "Login failed" });
        }
    }
    // Get current user from JWT token
    static async me(req, res) {
        try {
            // req.user is set by auth middleware
            const tokenUser = req.user;
            if (!tokenUser || !tokenUser.sub) {
                return res.status(401).json({ error: "Not authenticated" });
            }
            const user = await user_repository_1.UserRepository.findById(tokenUser.sub);
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }
            // Get role name
            let roleName = null;
            if (user.RoleId) {
                const role = await role_repository_1.RoleRepository.findById(user.RoleId);
                roleName = role?.name || null;
            }
            const profile = await userProfile_repository_1.default.getByUserId(tokenUser.sub);
            // Resolve photoUrl to full URL if it's a relative uploads path
            const stored = profile?.PhotoUrl;
            const host = req.get("host");
            const protocol = req.protocol || "http";
            const photoUrl = stored
                ? stored.startsWith("http")
                    ? stored
                    : `${protocol}://${host}${stored}`
                : null;
            res.json({
                id: user.Id,
                email: user.Email,
                displayName: profile?.DisplayName || user.DisplayName,
                roleId: user.RoleId,
                roleName,
                createdAt: user.CreatedAt,
                status: profile?.Status || null,
                photoUrl,
                bio: profile?.Bio || null,
                omniChatEnabled: typeof user.OmniChatEnabled === "boolean"
                    ? user.OmniChatEnabled
                    : user.OmniChatEnabled === 1,
            });
        }
        catch (error) {
            console.error("Me error:", error);
            res.status(500).json({ error: error.message || "Failed to get user" });
        }
    }
    static async assignRole(req, res) {
        try {
            const { userId, roleId } = req.body;
            if (!userId || !roleId)
                return res.status(400).json({ error: "userId and roleId required" });
            await user_repository_1.UserRepository.assignRole(userId, roleId);
            res.json({ ok: true });
        }
        catch (error) {
            console.error("Assign role error:", error);
            res.status(500).json({ error: error.message || "Failed to assign role" });
        }
    }
    static async changePassword(req, res) {
        try {
            const user = req.user;
            if (!user || !user.sub)
                return res.status(401).json({ error: "unauthorized" });
            const { currentPassword, newPassword } = req.body || {};
            if (!currentPassword || !newPassword)
                return res
                    .status(400)
                    .json({ error: "currentPassword and newPassword required" });
            const dbUser = await user_repository_1.UserRepository.findById(user.sub);
            if (!dbUser)
                return res.status(404).json({ error: "user not found" });
            const ok = await user_repository_1.UserRepository.verifyPassword(user.sub, currentPassword);
            if (!ok)
                return res.status(401).json({ error: "invalid current password" });
            // Update password (UserRepository.update will hash the password)
            await user_repository_1.UserRepository.update(user.sub, dbUser.Email || null, dbUser.DisplayName || null, newPassword, dbUser.RoleId || null);
            res.json({ ok: true });
        }
        catch (err) {
            console.error("Change password error:", err);
            res
                .status(500)
                .json({ error: err.message || "Failed to change password" });
        }
    }
}
exports.AuthController = AuthController;
