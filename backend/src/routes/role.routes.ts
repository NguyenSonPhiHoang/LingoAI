import { Router } from "express";
import { RoleController } from "../controllers/role.controller";
import { authenticateJWT, authorizeRoles } from "../middleware/auth.middleware";

const router = Router();

// All role routes require Admin
router.use(authenticateJWT, authorizeRoles("role_admin"));

router.get("/", RoleController.list);
router.get("/:id", RoleController.getById);
router.post("/", RoleController.create);
router.put("/:id", RoleController.update);
router.delete("/:id", RoleController.delete);

export default router;
