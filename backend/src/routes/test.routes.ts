import { Router } from "express";
import { TestController } from "../controllers/test.controller";
import { authenticateJWT, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();

// Protected routes
router.use(authenticateJWT);

// Student: my tests
router.get("/me", TestController.listMyTests);
router.post("/", TestController.create);

// Single test
router.get("/:id", TestController.getById);
router.put("/:id", TestController.update);
router.delete("/:id", TestController.delete);

// Admin/Teacher: view user's tests
router.get(
  "/user/:userId",
  authorizeRoles("role_admin", "role_teacher"),
  TestController.listByUser
);

export default router;
