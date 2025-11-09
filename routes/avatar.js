// routes/avatar.js
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { authenticate } from "./user.js";
import User from "../models/User.js";

const router = express.Router();

// ensure folder
const avatarDir = "avatars";
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarDir),
  filename: (req, file, cb) =>
    cb(null, req.userId + path.extname(file.originalname)),
});
const upload = multer({ storage });

router.post("/upload", authenticate, upload.single("avatar"), async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    user.avatar = `/avatars/${req.file.filename}`;
    await user.save();
    res.json({ message: "Avatar updated", avatarUrl: user.avatar });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to upload avatar" });
  }
});

export default router;
