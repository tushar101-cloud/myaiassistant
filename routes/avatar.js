// routes/avatar.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { authenticate } from "./user.js";

const router = express.Router();

// Ensure upload directories exist
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`),
});

const upload = multer({ storage });

// ✅ File upload endpoint
router.post("/file", authenticate, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded." });

  const fileUrl = `${process.env.BASE_URL || ""}/uploads/${req.file.filename}`;
  res.json({ message: "✅ File uploaded successfully", url: fileUrl });
});

export default router;
