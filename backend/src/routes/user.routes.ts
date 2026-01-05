import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const router = Router();

// Public list (legacy)
router.get("/", UserController.list);
router.post("/ensure-table", UserController.ensureTable);

// Admin routes
router.get(
  "/admin",
  requireAuth,
  requireRole("Admin"),
  UserController.adminList
);
router.get(
  "/admin/:id",
  requireAuth,
  requireRole("Admin"),
  UserController.adminGet
);
router.post(
  "/admin",
  requireAuth,
  requireRole("Admin"),
  UserController.adminCreate
);
router.put(
  "/admin/:id",
  requireAuth,
  requireRole("Admin"),
  UserController.adminUpdate
);
router.delete(
  "/admin/:id",
  requireAuth,
  requireRole("Admin"),
  UserController.adminDelete
);

export default router;
