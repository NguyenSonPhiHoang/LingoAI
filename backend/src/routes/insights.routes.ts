import { Router } from "express";
import { authenticateJWT } from "../middleware/auth.middleware";
import { InsightsController } from "../controllers/insights.controller";

const router = Router();
router.use(authenticateJWT);

router.get("/me", InsightsController.getMyInsights);

export default router;
