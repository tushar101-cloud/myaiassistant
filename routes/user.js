// routes/user.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";
import path from "path";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";

dotenv.config();
const router = express.Router();

/* ============================================================
   📂 Multer Setup for Avatar Upload
============================================================ */
const uploadDir = "uploads/avatars";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`),
});
const upload = multer({ storage });

/* ============================================================
   🔐 REGISTER — Create new account
============================================================ */
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: "Username and password are required." });

    const exists = await User.findOne({ username });
    if (exists)
      return res.status(400).json({ error: "Username already exists." });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashed });
    await user.save();

    return res.json({ message: "✅ Registration successful" });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ error: "Server error during registration" });
  }
});

/* ============================================================
   🔑 LOGIN — Get JWT token
============================================================ */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: "Username and password required." });

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: "Invalid credentials." });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Invalid credentials." });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.json({
      message: "Login successful",
      token,
      username: user.username,
      avatar: user.avatar || "",
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Server error during login" });
  }
});

/* ============================================================
   🔍 AUTH MIDDLEWARE — verify JWT for protected routes
============================================================ */
export function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).json({ error: "Access denied. No token provided." });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.userId = decoded.id;
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res.status(403).json({ error: "Invalid or expired token." });
  }
}

/* ============================================================
   👤 GET CURRENT USER — /api/auth/me
============================================================ */
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ user });
  } catch (err) {
    console.error("Get /me error:", err);
    res.status(500).json({ error: "Server error fetching user." });
  }
});

/* ============================================================
   🖼️ UPLOAD AVATAR — /api/auth/avatar
============================================================ */
router.post("/avatar", authenticate, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({ error: "No file uploaded." });

    const user = await User.findById(req.userId);
    const fileUrl = `${process.env.BASE_URL || ""}/uploads/avatars/${req.file.filename}`;
    user.avatar = fileUrl;
    await user.save();

    res.json({ message: "✅ Avatar updated successfully.", avatar: fileUrl });
  } catch (err) {
    console.error("Avatar upload error:", err);
    res.status(500).json({ error: "Server error during avatar upload." });
  }
});

/* ============================================================
   🔵 GOOGLE LOGIN — /api/auth/google
============================================================ */
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: "Missing credential" });

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name;

    let user = await User.findOne({ username: email });
    if (!user) {
      user = new User({
        username: email,
        password: await bcrypt.hash(Math.random().toString(36).slice(-8), 10),
        avatar: payload.picture,
      });
      await user.save();
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({
      message: "✅ Google login successful",
      token,
      username: user.username,
      avatar: user.avatar,
    });
  } catch (err) {
    console.error("Google login error:", err);
    res.status(500).json({ error: "Failed to login with Google" });
  }
});

export default router;
