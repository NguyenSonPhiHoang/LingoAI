import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import UserProjectController from "../controllers/userProject.controller";

const router = Router();

router.get("/", requireAuth, UserProjectController.list);
router.get("/:id", requireAuth, UserProjectController.get);
router.post("/", requireAuth, UserProjectController.create);
router.put("/:id", requireAuth, UserProjectController.update);
router.delete("/:id", requireAuth, UserProjectController.remove);

export default router;
