import express from "express";
import VtepTestController from "../controllers/vteptest.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const router = express.Router();

// Admin: create and manage vteptests
router.post(
  "/",
  requireAuth,
  requireRole("Admin", "Teacher"),
  VtepTestController.create,
);
router.get(
  "/",
  requireAuth,
  requireRole("Admin", "Teacher"),
  VtepTestController.listAll,
);

router.get("/active", requireAuth, VtepTestController.listActive);

router.get(
  "/:id",
  requireAuth,
  requireRole("Admin", "Teacher"),
  VtepTestController.getById,
);

router.put(
  "/:id",
  requireAuth,
  requireRole("Admin", "Teacher"),
  VtepTestController.update,
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("Admin", "Teacher"),
  VtepTestController.delete,
);

// Students (authenticated) can list active/public vteptests

// Instantiate a VTEP test for current user (creates Tests + TestItems)
router.post("/:id/instantiate", requireAuth, VtepTestController.instantiate);

// Items management (Admin/Teacher)
router.get(
  "/:id/items",
  requireAuth,
  requireRole("Admin", "Teacher"),
  VtepTestController.listItems,
);
router.post(
  "/:id/items",
  requireAuth,
  requireRole("Admin", "Teacher"),
  VtepTestController.addItems,
);
router.put(
  "/:id/items/:itemId",
  requireAuth,
  requireRole("Admin", "Teacher"),
  VtepTestController.updateItem,
);
router.delete(
  "/:id/items/:itemId",
  requireAuth,
  requireRole("Admin", "Teacher"),
  VtepTestController.deleteItem,
);

export default router;
