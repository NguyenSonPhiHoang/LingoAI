import { Router } from "express";
import { authenticateJWT } from "../middleware/auth.middleware";
import { UserVocabularyController } from "../controllers/userVocabulary.controller";

const router = Router();

router.get("/me", authenticateJWT, UserVocabularyController.listMe);
router.post("/", authenticateJWT, UserVocabularyController.upsertMe);
router.post("/bulk", authenticateJWT, UserVocabularyController.bulkUpsertMe);
router.post("/:id/learn", authenticateJWT, UserVocabularyController.learnMe);
router.put("/:id", authenticateJWT, UserVocabularyController.updateMe);
router.delete("/:id", authenticateJWT, UserVocabularyController.deleteMe);

export default router;
