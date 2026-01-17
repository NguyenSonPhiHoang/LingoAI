"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const role_routes_1 = __importDefault(require("./routes/role.routes"));
const lesson_routes_1 = __importDefault(require("./routes/lesson.routes"));
const vocabulary_routes_1 = __importDefault(require("./routes/vocabulary.routes"));
const word_routes_1 = __importDefault(require("./routes/word.routes"));
const userVocabulary_routes_1 = __importDefault(require("./routes/userVocabulary.routes"));
const storybook_routes_1 = __importDefault(require("./routes/storybook.routes"));
const test_routes_1 = __importDefault(require("./routes/test.routes"));
const insights_routes_1 = __importDefault(require("./routes/insights.routes"));
const progress_routes_1 = __importDefault(require("./routes/progress.routes"));
const userSettings_routes_1 = __importDefault(require("./routes/userSettings.routes"));
const userProject_routes_1 = __importDefault(require("./routes/userProject.routes"));
const userProfile_routes_1 = __importDefault(require("./routes/userProfile.routes"));
const library_routes_1 = __importDefault(require("./routes/library.routes"));
const learningResource_routes_1 = __importDefault(require("./routes/learningResource.routes"));
const ai_routes_1 = __importDefault(require("./routes/ai.routes"));
const grammar_routes_1 = __importDefault(require("./routes/grammar.routes"));
const auth_middleware_1 = require("./middleware/auth.middleware");
const config_1 = require("./config");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const app = (0, express_1.default)();
const parseCorsOrigins = (value) => value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
const allowedOrigins = parseCorsOrigins(config_1.config.corsOrigin);
const allowAnyOrigin = allowedOrigins.includes("*");
const corsOptions = {
    origin: (origin, callback) => {
        // Allow non-browser requests (no Origin header)
        if (!origin)
            return callback(null, true);
        if (allowAnyOrigin)
            return callback(null, true);
        if (allowedOrigins.includes(origin))
            return callback(null, true);
        return callback(new Error("Not allowed by CORS"), false);
    },
    credentials: true,
};
app.use((0, cors_1.default)(corsOptions));
app.use(body_parser_1.default.json({ limit: "15mb" }));
// Ensure uploads folder exists and serve it statically for profile photos
const uploadsPath = path_1.default.join(__dirname, "..", "uploads");
fs_1.default.mkdirSync(path_1.default.join(uploadsPath, "profiles"), { recursive: true });
app.use("/uploads", express_1.default.static(uploadsPath));
// Auth (public)
app.use("/api/auth", auth_routes_1.default);
// Users (protected in routes)
app.use("/api/users", user_routes_1.default);
// Roles (Admin only)
app.use("/api/roles", role_routes_1.default);
// Lessons (public read, protected write)
app.use("/api/lessons", lesson_routes_1.default);
// Vocabulary (public read, protected write)
app.use("/api/vocabulary", vocabulary_routes_1.default);
// Words (global) and UserVocabulary (per-user)
app.use("/api/words", word_routes_1.default);
app.use("/api/user-vocabulary", userVocabulary_routes_1.default);
// Storybooks (public read, protected write)
app.use("/api/storybooks", storybook_routes_1.default);
// Tests (protected)
app.use("/api/tests", test_routes_1.default);
// Insights (protected)
app.use("/api/insights", insights_routes_1.default);
// Progress (protected)
app.use("/api/progress", progress_routes_1.default);
// User settings (per-user)
app.use("/api/settings", userSettings_routes_1.default);
// User projects (per-user)
app.use("/api/projects", userProject_routes_1.default);
// User profile (per-user)
app.use("/api/profile", userProfile_routes_1.default);
// Library (per-user)
app.use("/api/library", library_routes_1.default);
// Learning resources (system-wide)
app.use("/api/learning-resources", learningResource_routes_1.default);
// AI (Gemini)
app.use("/api/ai", ai_routes_1.default);
// Grammar (system-wide public content)
app.use("/api/grammar", grammar_routes_1.default);
// Current user info
app.get("/api/me", auth_middleware_1.authenticateJWT, (req, res) => {
    res.json({ user: req.user });
});
app.get("/health", (req, res) => res.json({ ok: true }));
exports.default = app;
