import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import LibraryController from "../controllers/library.controller";

const router = Router();

// Documents
router.get("/", requireAuth, LibraryController.listMyDocuments);
router.post("/", requireAuth, LibraryController.createMyDocument);
router.get("/:id", requireAuth, LibraryController.getMyDocument);
router.put("/:id", requireAuth, LibraryController.updateMyDocument);
router.delete("/:id", requireAuth, LibraryController.deleteMyDocument);

// Contents (notes)
router.get("/:id/content", requireAuth, LibraryController.listMyContent);
router.post("/:id/content", requireAuth, LibraryController.addMyContent);
router.put(
  "/content/:contentId",
  requireAuth,
  LibraryController.updateMyContent
);
router.delete(
  "/content/:contentId",
  requireAuth,
  LibraryController.deleteMyContent
);

// Single note page per document
router.get("/:id/note-page", requireAuth, LibraryController.getMyNotePage);
router.put("/:id/note-page", requireAuth, LibraryController.upsertMyNotePage);

export default router;
