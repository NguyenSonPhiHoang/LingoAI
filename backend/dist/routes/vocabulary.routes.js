"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const vocabulary_controller_1 = require("../controllers/vocabulary.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Public: list and get
router.get("/", vocabulary_controller_1.VocabularyController.list);
router.get("/:id", vocabulary_controller_1.VocabularyController.getById);
// Protected: create/update/delete (Teacher or Admin)
router.post("/", auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRoles)("role_admin", "role_teacher"), vocabulary_controller_1.VocabularyController.create);
router.put("/:id", auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRoles)("role_admin", "role_teacher"), vocabulary_controller_1.VocabularyController.update);
router.delete("/:id", auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRoles)("role_admin", "role_teacher"), vocabulary_controller_1.VocabularyController.delete);
exports.default = router;
