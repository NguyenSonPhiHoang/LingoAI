import express from "express";
import bodyParser from "body-parser";
import cors, { type CorsOptions } from "cors";
import userRoutes from "./routes/user.routes";
import authRoutes from "./routes/auth.routes";
import roleRoutes from "./routes/role.routes";
import lessonRoutes from "./routes/lesson.routes";
import vocabularyRoutes from "./routes/vocabulary.routes";
import wordRoutes from "./routes/word.routes";
import userVocabularyRoutes from "./routes/userVocabulary.routes";
import storybookRoutes from "./routes/storybook.routes";
import testRoutes from "./routes/test.routes";
import insightsRoutes from "./routes/insights.routes";
import progressRoutes from "./routes/progress.routes";
import userSettingsRoutes from "./routes/userSettings.routes";
import userProjectRoutes from "./routes/userProject.routes";
import userProfileRoutes from "./routes/userProfile.routes";
import libraryRoutes from "./routes/library.routes";
import learningResourceRoutes from "./routes/learningResource.routes";
import aiRoutes from "./routes/ai.routes";
import grammarRoutes from "./routes/grammar.routes";
import vtepRoutes from "./routes/vtep.routes";
import { authenticateJWT } from "./middleware/auth.middleware";
import { config } from "./config";
import path from "path";
import fs from "fs";

const app = express();

const parseCorsOrigins = (value: string): string[] =>
  value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const allowedOrigins = parseCorsOrigins(config.corsOrigin);
const allowAnyOrigin = allowedOrigins.includes("*");

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (no Origin header)
    if (!origin) return callback(null, true);
    if (allowAnyOrigin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Not allowed by CORS"), false);
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: "15mb" }));

// Ensure uploads folder exists and serve it statically for profile photos
const uploadsPath = path.join(__dirname, "..", "uploads");
fs.mkdirSync(path.join(uploadsPath, "profiles"), { recursive: true });
app.use("/uploads", express.static(uploadsPath));

// Auth (public)
app.use("/api/auth", authRoutes);

// Users (protected in routes)
app.use("/api/users", userRoutes);

// Roles (Admin only)
app.use("/api/roles", roleRoutes);

// Lessons (public read, protected write)
app.use("/api/lessons", lessonRoutes);

// Vocabulary (public read, protected write)
app.use("/api/vocabulary", vocabularyRoutes);

// Words (global) and UserVocabulary (per-user)
app.use("/api/words", wordRoutes);
app.use("/api/user-vocabulary", userVocabularyRoutes);

// Storybooks (public read, protected write)
app.use("/api/storybooks", storybookRoutes);

// Tests (protected)
app.use("/api/tests", testRoutes);

// Insights (protected)
app.use("/api/insights", insightsRoutes);

// Progress (protected)
app.use("/api/progress", progressRoutes);

// User settings (per-user)
app.use("/api/settings", userSettingsRoutes);

// User projects (per-user)
app.use("/api/projects", userProjectRoutes);

// User profile (per-user)
app.use("/api/profile", userProfileRoutes);

// Library (per-user)
app.use("/api/library", libraryRoutes);

// Learning resources (system-wide)
app.use("/api/learning-resources", learningResourceRoutes);

// AI (Gemini)
app.use("/api/ai", aiRoutes);

// Grammar (system-wide public content)
app.use("/api/grammar", grammarRoutes);
// VTEP document import and management
app.use("/api/vtep", vtepRoutes);

// Current user info
app.get("/api/me", authenticateJWT, (req, res) => {
  res.json({ user: (req as any).user });
});

app.get("/health", (req, res) => res.json({ ok: true }));

export default app;
