import { Router, type Request } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import UserProfileController, {
  uploadPhotoHandler,
} from "../controllers/userProfile.controller";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// Ensure uploads/profiles directory exists
const uploadsDir = path.join(__dirname, "..", "..", "uploads", "profiles");
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (
    req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void
  ) {
    cb(null, uploadsDir);
  },
  filename: function (
    req: any,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void
  ) {
    const ext = path.extname(file.originalname) || "";
    const name = `${req.user?.sub || "anon"}_${Date.now()}${ext}`;
    cb(null, name);
  },
});

const upload = multer({ storage });

router.get("/", requireAuth, UserProfileController.getCurrent);
router.put("/", requireAuth, UserProfileController.upsert);

// Upload avatar/photo
router.post("/photo", requireAuth, upload.single("file"), uploadPhotoHandler);

export default router;
