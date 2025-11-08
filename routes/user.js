// routes/user.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();
const router = express.Router();

// Register
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log("📩 Register request:", username);

    if (!username || !password)
      return res.status(400).json({ error: "Username and password required" });

    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ error: "Username already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashed });
    await user.save();

    console.log("✅ Registered successfully:", user.username);
    return res.json({ message: "Registration successful" });
  } catch (err) {
    console.error("❌ Register error:", err);
    return res.status(500).json({ error: err.message });
  }
});


// Login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: "Username and password required" });

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.json({ token, username: user.username });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Middleware to authenticate requests (use in AI routes)
export function authenticate(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer "))
      return res.status(401).json({ error: "No token provided" });
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    return next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid token" });
  }
}

export default router;
