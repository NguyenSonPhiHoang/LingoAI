"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const learningResource_controller_1 = require("../controllers/learningResource.controller");
const router = (0, express_1.Router)();
// Everyone authenticated can view + rate
router.get("/", auth_middleware_1.requireAuth, learningResource_controller_1.LearningResourceController.list);
router.post("/:id/rate", auth_middleware_1.requireAuth, learningResource_controller_1.LearningResourceController.rate);
// Admin-only write
router.post("/", auth_middleware_1.requireAuth, (0, auth_middleware_1.authorizeRoles)("role_admin"), learningResource_controller_1.LearningResourceController.create);
router.delete("/:id", auth_middleware_1.requireAuth, (0, auth_middleware_1.authorizeRoles)("role_admin"), learningResource_controller_1.LearningResourceController.delete);
exports.default = router;
