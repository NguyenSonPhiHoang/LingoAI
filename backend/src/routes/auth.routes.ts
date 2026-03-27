import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const router = Router();
router.post("/register", AuthController.register);
router.post("/verify-otp", AuthController.verifyOtp);
router.post("/login", AuthController.login);
router.get("/me", requireAuth, AuthController.me);
router.post("/change-password", requireAuth, AuthController.changePassword);
router.post(
  "/assign-role",
  requireAuth,
  requireRole("Admin"),
  AuthController.assignRole
);

export default router;
