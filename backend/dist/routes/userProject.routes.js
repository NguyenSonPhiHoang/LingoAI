"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const userProject_controller_1 = __importDefault(require("../controllers/userProject.controller"));
const router = (0, express_1.Router)();
router.get("/", auth_middleware_1.requireAuth, userProject_controller_1.default.list);
router.get("/:id", auth_middleware_1.requireAuth, userProject_controller_1.default.get);
router.post("/", auth_middleware_1.requireAuth, userProject_controller_1.default.create);
router.put("/:id", auth_middleware_1.requireAuth, userProject_controller_1.default.update);
router.delete("/:id", auth_middleware_1.requireAuth, userProject_controller_1.default.remove);
exports.default = router;
