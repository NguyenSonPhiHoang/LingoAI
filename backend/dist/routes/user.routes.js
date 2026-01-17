"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Public list (legacy)
router.get("/", user_controller_1.UserController.list);
router.post("/ensure-table", user_controller_1.UserController.ensureTable);
// Admin routes
router.get("/admin", auth_middleware_1.requireAuth, (0, auth_middleware_1.requireRole)("Admin"), user_controller_1.UserController.adminList);
router.get("/admin/:id", auth_middleware_1.requireAuth, (0, auth_middleware_1.requireRole)("Admin"), user_controller_1.UserController.adminGet);
router.post("/admin", auth_middleware_1.requireAuth, (0, auth_middleware_1.requireRole)("Admin"), user_controller_1.UserController.adminCreate);
router.put("/admin/:id", auth_middleware_1.requireAuth, (0, auth_middleware_1.requireRole)("Admin"), user_controller_1.UserController.adminUpdate);
router.delete("/admin/:id", auth_middleware_1.requireAuth, (0, auth_middleware_1.requireRole)("Admin"), user_controller_1.UserController.adminDelete);
exports.default = router;
