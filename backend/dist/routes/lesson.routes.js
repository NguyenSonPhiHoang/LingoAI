"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const lesson_controller_1 = require("../controllers/lesson.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Public: list and get
router.get("/", lesson_controller_1.LessonController.list);
router.get("/:id", lesson_controller_1.LessonController.getById);
router.get("/author/:authorId", lesson_controller_1.LessonController.getByAuthor);
router.get("/:id/vocabulary", lesson_controller_1.LessonController.getVocabulary);
// Protected: create/update/delete (Teacher or Admin)
router.post("/", auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRoles)("role_admin", "role_teacher"), lesson_controller_1.LessonController.create);
router.put("/:id", auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRoles)("role_admin", "role_teacher"), lesson_controller_1.LessonController.update);
router.delete("/:id", auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRoles)("role_admin", "role_teacher"), lesson_controller_1.LessonController.delete);
// Vocabulary links (Teacher or Admin)
router.post("/:id/vocabulary", auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRoles)("role_admin", "role_teacher"), lesson_controller_1.LessonController.addVocabulary);
router.delete("/:id/vocabulary/:vocabId", auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRoles)("role_admin", "role_teacher"), lesson_controller_1.LessonController.removeVocabulary);
exports.default = router;
