import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import userRoutes from "./routes/user.routes";
import authRoutes from "./routes/auth.routes";
import roleRoutes from "./routes/role.routes";
import lessonRoutes from "./routes/lesson.routes";
import vocabularyRoutes from "./routes/vocabulary.routes";
import storybookRoutes from "./routes/storybook.routes";
import testRoutes from "./routes/test.routes";
import progressRoutes from "./routes/progress.routes";
import userSettingsRoutes from "./routes/userSettings.routes";
import userProjectRoutes from "./routes/userProject.routes";
import userProfileRoutes from "./routes/userProfile.routes";
import { authenticateJWT } from "./middleware/auth.middleware";
import { config } from "./config";
import path from "path";
import fs from "fs";

const app = express();
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(bodyParser.json());

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

// Storybooks (public read, protected write)
app.use("/api/storybooks", storybookRoutes);

// Tests (protected)
app.use("/api/tests", testRoutes);

// Progress (protected)
app.use("/api/progress", progressRoutes);

// User settings (per-user)
app.use("/api/settings", userSettingsRoutes);

// User projects (per-user)
app.use("/api/projects", userProjectRoutes);

// User profile (per-user)
app.use("/api/profile", userProfileRoutes);

// Current user info
app.get("/api/me", authenticateJWT, (req, res) => {
  res.json({ user: (req as any).user });
});

app.get("/health", (req, res) => res.json({ ok: true }));

export default app;
