"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserProfileController = void 0;
exports.uploadPhotoHandler = uploadPhotoHandler;
const userProfile_repository_1 = __importDefault(require("../repositories/userProfile.repository"));
class UserProfileController {
    static async getCurrent(req, res) {
        try {
            const user = req.user;
            if (!user || !user.sub)
                return res.status(401).json({ error: "unauthorized" });
            const dbProfile = await userProfile_repository_1.default.getByUserId(user.sub);
            const profile = dbProfile || {
                UserId: user.sub,
                DisplayName: user.displayName || null,
                PhotoUrl: null,
                Bio: null,
                Status: null,
                CreatedAt: null,
                UpdatedAt: null,
            };
            // If stored PhotoUrl is a relative path (starting with /uploads), prefix with request host
            const stored = profile.PhotoUrl;
            const host = req.get("host");
            const protocol = req.protocol || "http";
            const photoUrl = stored
                ? stored.startsWith("http")
                    ? stored
                    : `${protocol}://${host}${stored}`
                : null;
            res.json({
                userId: profile.UserId,
                displayName: profile.DisplayName,
                photoUrl,
                bio: profile.Bio,
                status: profile.Status,
                createdAt: profile.CreatedAt,
                updatedAt: profile.UpdatedAt,
            });
        }
        catch (err) {
            console.error("Get profile error:", err);
            res.status(500).json({ error: err.message || "Failed to get profile" });
        }
    }
    static async upsert(req, res) {
        try {
            const user = req.user;
            if (!user || !user.sub)
                return res.status(401).json({ error: "unauthorized" });
            const { displayName, photoUrl, bio, status } = req.body || {};
            const existing = await userProfile_repository_1.default.getByUserId(user.sub);
            const now = new Date();
            // Normalize photoUrl: if client provided an absolute URL that points to /uploads,
            // store only the relative path (so domain is not persisted)
            let storedPhoto = photoUrl ?? existing?.PhotoUrl ?? null;
            if (storedPhoto && storedPhoto.startsWith("http")) {
                const idx = storedPhoto.indexOf("/uploads/");
                if (idx >= 0)
                    storedPhoto = storedPhoto.substring(idx);
            }
            const profile = {
                UserId: user.sub,
                DisplayName: displayName ?? existing?.DisplayName ?? null,
                PhotoUrl: storedPhoto,
                Bio: bio ?? existing?.Bio ?? null,
                Status: status ?? existing?.Status ?? null,
                CreatedAt: existing?.CreatedAt || now,
                UpdatedAt: now,
            };
            await userProfile_repository_1.default.upsert(profile);
            const host = req.get("host");
            const protocol = req.protocol || "http";
            const photoFull = profile.PhotoUrl
                ? profile.PhotoUrl.startsWith("http")
                    ? profile.PhotoUrl
                    : `${protocol}://${host}${profile.PhotoUrl}`
                : null;
            res.json({
                userId: profile.UserId,
                displayName: profile.DisplayName,
                photoUrl: photoFull,
                bio: profile.Bio,
                status: profile.Status,
                createdAt: profile.CreatedAt,
                updatedAt: profile.UpdatedAt,
            });
        }
        catch (err) {
            console.error("Upsert profile error:", err);
            res.status(500).json({ error: err.message || "Failed to save profile" });
        }
    }
}
exports.UserProfileController = UserProfileController;
exports.default = UserProfileController;
// Handle photo upload (expects multer middleware to have saved file at req.file)
async function uploadPhotoHandler(req, res) {
    try {
        const user = req.user;
        if (!user || !user.sub)
            return res.status(401).json({ error: "unauthorized" });
        const file = req.file;
        if (!file)
            return res.status(400).json({ error: "file required" });
        // Store relative path (so domain can be added dynamically by the server)
        const relativePath = `/uploads/profiles/${file.filename}`;
        const host = req.get("host");
        const protocol = req.protocol || "http";
        const photoUrl = `${protocol}://${host}${relativePath}`;
        const existing = await userProfile_repository_1.default.getByUserId(user.sub);
        const now = new Date();
        const profile = {
            UserId: user.sub,
            DisplayName: existing?.DisplayName || user.displayName || null,
            PhotoUrl: relativePath,
            Bio: existing?.Bio || null,
            Status: existing?.Status || null,
            CreatedAt: existing?.CreatedAt || now,
            UpdatedAt: now,
        };
        await userProfile_repository_1.default.upsert(profile);
        res.json({
            ok: true,
            photoUrl,
            profile: {
                userId: profile.UserId,
                displayName: profile.DisplayName,
                photoUrl: photoUrl,
                bio: profile.Bio,
                status: profile.Status,
                createdAt: profile.CreatedAt,
                updatedAt: profile.UpdatedAt,
            },
        });
    }
    catch (err) {
        console.error("Upload photo error:", err);
        res.status(500).json({ error: err.message || "Failed to upload photo" });
    }
}
