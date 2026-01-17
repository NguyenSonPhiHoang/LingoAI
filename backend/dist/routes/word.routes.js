"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const word_controller_1 = require("../controllers/word.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Protected: global words are managed by Teacher/Admin
router.get("/", auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRoles)("role_admin", "role_teacher"), word_controller_1.WordController.list);
router.put("/:id", auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRoles)("role_admin", "role_teacher"), word_controller_1.WordController.update);
exports.default = router;
