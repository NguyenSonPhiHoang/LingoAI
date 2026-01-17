"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const test_controller_1 = require("../controllers/test.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// Protected routes
router.use(auth_middleware_1.authenticateJWT);
// Student: my tests
router.get("/me", test_controller_1.TestController.listMyTests);
router.post("/", test_controller_1.TestController.create);
// Single test
router.get("/:id", test_controller_1.TestController.getById);
router.get("/:id/items", test_controller_1.TestController.listItemsByTest);
router.put("/:id", test_controller_1.TestController.update);
router.delete("/:id", test_controller_1.TestController.delete);
// Admin/Teacher: view user's tests
router.get("/user/:userId", (0, auth_middleware_1.authorizeRoles)("role_admin", "role_teacher"), test_controller_1.TestController.listByUser);
exports.default = router;
