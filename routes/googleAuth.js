import express from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();
const router = express.Router();

// Google login (frontend sends Google ID + email + name)
router.post("/google", async (req, res) => {
  try {
    const { googleId, email, name, avatar } = req.body;
    if (!googleId || !email)
      return res.status(400).json({ error: "Invalid Google credentials" });

    let user = await User.findOne({ username: email });
    if (!user) {
      user = new User({ username: email, password: googleId, avatar });
      await user.save();
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ token, username: user.username, avatar: user.avatar });
  } catch (err) {
    console.error("Google login error:", err);
    res.status(500).json({ error: "Server error with Google login" });
  }
});

export default router;
