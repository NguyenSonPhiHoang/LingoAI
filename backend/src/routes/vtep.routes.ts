import express from "express";
import multer from "multer";
import VtepController from "../controllers/vtep.controller";
import { requireRole, requireAuth } from "../middleware/auth.middleware";

const router = express.Router();

// Multer temp storage in uploads/tmp
const tmp = multer({ dest: "uploads/tmp/" });

// Admin-only upload and management
router.post(
  "/import/pdf",
  // Authenticate first, then verify role, then parse multipart body
  requireAuth,
  requireRole("Admin", "Teacher"),
  tmp.single("file"),
  VtepController.uploadPdf,
);

router.post(
  "/documents/:id/audio",
  requireAuth,
  requireRole("Admin", "Teacher"),
  tmp.single("file"),
  VtepController.uploadAudio,
);

router.get(
  "/documents",
  requireAuth,
  requireRole("Admin", "Teacher"),
  VtepController.listDocuments,
);
router.get(
  "/public/documents",
  requireAuth,
  VtepController.listDocumentsPublic,
);
router.get(
  "/documents/:id",
  requireAuth,
  requireRole("Admin", "Teacher"),
  VtepController.getDocument,
);

router.get(
  "/documents/:id/items",
  requireAuth,
  requireRole("Admin", "Teacher"),
  VtepController.listItems,
);
router.get(
  "/public/documents/:id/items",
  requireAuth,
  VtepController.listItemsPublic,
);

router.post(
  "/documents",
  requireAuth,
  requireRole("Admin", "Teacher"),
  VtepController.createDocumentManual,
);

router.put(
  "/documents/:id",
  requireAuth,
  requireRole("Admin", "Teacher"),
  VtepController.updateDocument,
);

router.delete(
  "/documents/:id",
  requireAuth,
  requireRole("Admin", "Teacher"),
  VtepController.deleteDocument,
);

router.post(
  "/documents/:id/items",
  requireAuth,
  requireRole("Admin", "Teacher"),
  VtepController.createItemsForDocument,
);

router.put(
  "/documents/:docId/items/:itemId",
  requireAuth,
  requireRole("Admin", "Teacher"),
  VtepController.updateItem,
);

router.delete(
  "/documents/:docId/items/:itemId",
  requireAuth,
  requireRole("Admin", "Teacher"),
  VtepController.deleteItem,
);

export default router;
