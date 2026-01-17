"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const role_controller_1 = require("../controllers/role.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// All role routes require Admin
router.use(auth_middleware_1.authenticateJWT, (0, auth_middleware_1.authorizeRoles)("role_admin"));
router.get("/", role_controller_1.RoleController.list);
router.get("/:id", role_controller_1.RoleController.getById);
router.post("/", role_controller_1.RoleController.create);
router.put("/:id", role_controller_1.RoleController.update);
router.delete("/:id", role_controller_1.RoleController.delete);
exports.default = router;
