import { Router } from "express";
import UserSettingsController from "../controllers/userSettings.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

// Get current user's settings
router.get("/", requireAuth, UserSettingsController.getCurrentUserSettings);

// Save/Update current user's settings
router.put("/", requireAuth, UserSettingsController.saveCurrentUserSettings);

export default router;
