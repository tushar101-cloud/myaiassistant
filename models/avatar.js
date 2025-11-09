// routes/avatar.js
import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import { authenticate } from "./user.js";
import User from "../models/User.js";

dotenv.config();
const router = express.Router();

// configure cloudinary using env vars
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload or update user avatar
router.post("/upload", authenticate, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file provided" });

    // convert buffer to data URI
    const fileData = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;

    const result = await cloudinary.uploader.upload(fileData, {
      folder: "my_ai_assistant/avatars",
      overwrite: true,
      resource_type: "image",
    });

    // Update user avatar URL
    await User.findByIdAndUpdate(req.userId, { avatar: result.secure_url });

    res.json({ success: true, avatar: result.secure_url });
  } catch (err) {
    console.error("Avatar upload error:", err);
    res.status(500).json({ error: "Failed to upload avatar" });
  }
});

export default router;
