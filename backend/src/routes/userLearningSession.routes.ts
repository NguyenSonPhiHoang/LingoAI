import { Router } from "express";
import UserLearningSessionController from "../controllers/userLearningSession.controller";
import { authenticateJWT, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();

// Protected: create and list my sessions
router.use(authenticateJWT);
router.post("/", UserLearningSessionController.create);
router.get("/me", UserLearningSessionController.getMySessions);

// Admin: view sessions for arbitrary user
router.get(
  "/user/:userId",
  authorizeRoles("role_admin", "role_teacher"),
  UserLearningSessionController.getByUser,
);

export default router;
