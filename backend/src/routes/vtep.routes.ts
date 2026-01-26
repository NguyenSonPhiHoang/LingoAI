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

router.get(
  "/documents",
  requireAuth,
  requireRole("Admin", "Teacher"),
  VtepController.listDocuments,
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

export default router;
