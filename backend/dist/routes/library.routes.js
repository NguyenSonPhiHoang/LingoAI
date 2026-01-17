"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const library_controller_1 = __importDefault(require("../controllers/library.controller"));
const router = (0, express_1.Router)();
// Documents
router.get("/", auth_middleware_1.requireAuth, library_controller_1.default.listMyDocuments);
router.post("/", auth_middleware_1.requireAuth, library_controller_1.default.createMyDocument);
router.get("/:id", auth_middleware_1.requireAuth, library_controller_1.default.getMyDocument);
router.put("/:id", auth_middleware_1.requireAuth, library_controller_1.default.updateMyDocument);
router.delete("/:id", auth_middleware_1.requireAuth, library_controller_1.default.deleteMyDocument);
// Contents (notes)
router.get("/:id/content", auth_middleware_1.requireAuth, library_controller_1.default.listMyContent);
router.post("/:id/content", auth_middleware_1.requireAuth, library_controller_1.default.addMyContent);
router.put("/content/:contentId", auth_middleware_1.requireAuth, library_controller_1.default.updateMyContent);
router.delete("/content/:contentId", auth_middleware_1.requireAuth, library_controller_1.default.deleteMyContent);
// Single note page per document
router.get("/:id/note-page", auth_middleware_1.requireAuth, library_controller_1.default.getMyNotePage);
router.put("/:id/note-page", auth_middleware_1.requireAuth, library_controller_1.default.upsertMyNotePage);
exports.default = router;
