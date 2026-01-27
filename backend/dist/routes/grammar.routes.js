"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const grammar_controller_1 = require("../controllers/grammar.controller");
const router = (0, express_1.Router)();
// Public to all authenticated users
router.get("/lessons", auth_middleware_1.requireAuth, grammar_controller_1.GrammarController.listLessons);
router.get("/lessons/:id", auth_middleware_1.requireAuth, grammar_controller_1.GrammarController.getLesson);
router.post("/lessons/:id/attempts", auth_middleware_1.requireAuth, grammar_controller_1.GrammarController.submitAttempt);
// Content management (Admin/Teacher)
router.post("/lessons", auth_middleware_1.requireAuth, (0, auth_middleware_1.authorizeRoles)("role_admin", "role_teacher"), grammar_controller_1.GrammarController.createLesson);
router.put("/lessons/:id", auth_middleware_1.requireAuth, (0, auth_middleware_1.authorizeRoles)("role_admin", "role_teacher"), grammar_controller_1.GrammarController.updateLesson);
router.post("/lessons/:id/exercises", auth_middleware_1.requireAuth, (0, auth_middleware_1.authorizeRoles)("role_admin", "role_teacher"), grammar_controller_1.GrammarController.upsertExercises);
router.post("/lessons/:id/generate-exercises", auth_middleware_1.requireAuth, (0, auth_middleware_1.authorizeRoles)("role_admin", "role_teacher"), grammar_controller_1.GrammarController.generateExercises);
exports.default = router;
