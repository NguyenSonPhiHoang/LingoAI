"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const ai_controller_1 = require("../controllers/ai.controller");
const router = (0, express_1.Router)();
// Authenticated users can chat with Gemini
router.post("/chat", auth_middleware_1.requireAuth, ai_controller_1.AiController.chat);
// Reply suggestions for user to say next
router.post("/reply-suggestions", auth_middleware_1.requireAuth, ai_controller_1.AiController.replySuggestions);
// Stateless translate for displaying translations in UI
router.post("/translate", auth_middleware_1.requireAuth, ai_controller_1.AiController.translate);
exports.default = router;
