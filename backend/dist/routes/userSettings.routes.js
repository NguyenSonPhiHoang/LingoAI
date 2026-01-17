"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userSettings_controller_1 = __importDefault(require("../controllers/userSettings.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Get current user's settings
router.get("/", auth_middleware_1.requireAuth, userSettings_controller_1.default.getCurrentUserSettings);
// Save/Update current user's settings
router.put("/", auth_middleware_1.requireAuth, userSettings_controller_1.default.saveCurrentUserSettings);
exports.default = router;
