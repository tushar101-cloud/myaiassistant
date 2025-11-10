// routes/upload.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import axios from "axios";
import dotenv from "dotenv";
import { authenticate } from "./user.js";

dotenv.config();
const router = express.Router();

// Create uploads directory if missing
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

// =======================================================
// 📤 Upload Endpoint
// =======================================================
router.post("/file", authenticate, upload.single("file"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ error: "No file uploaded" });

    const filePath = path.join(uploadDir, req.file.filename);
    const fileUrl = `${process.env.BASE_URL || "http://localhost:3000"}/uploads/${req.file.filename}`;

    console.log(`📎 Uploaded file: ${fileUrl}`);

    // 🧠 Send file to AI for analysis (optional auto-reply)
    const aiEndpoint = `${process.env.BASE_URL || "http://localhost:3000"}/api/ai/ask`;
    const aiPrompt = `Please summarize or describe the contents of the uploaded file: ${req.file.originalname}`;

    let aiReply = "";
    try {
      const aiRes = await axios.post(
        aiEndpoint,
        { message: aiPrompt, filePath },
        { headers: { Authorization: req.headers.authorization } }
      );
      aiReply = aiRes.data.reply || "";
    } catch (err) {
      console.warn("⚠️ AI file analysis failed:", err.message);
    }

    return res.json({
      message: "File uploaded successfully.",
      url: fileUrl,
      reply: aiReply || "File uploaded, but no AI summary available.",
    });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ error: "File upload failed." });
  }
});

// =======================================================
// 🖼️ Serve Uploaded Files (static hosting)
// =======================================================
router.use("/uploads", express.static(uploadDir));

export default router;
