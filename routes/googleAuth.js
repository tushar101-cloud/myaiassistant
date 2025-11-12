// routes/googleAuth.js
import express from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";

dotenv.config();
const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// 🔐 Verify Google token and issue JWT
router.post("/login", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: "Missing credential" });

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name;
    const picture = payload.picture;

    let user = await User.findOne({ username: email });

    if (!user) {
      user = new User({
        username: email,
        password: "",
        avatar: picture,
      });
      await user.save();
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      message: "✅ Google login successful",
      token,
      username: user.username,
      avatar: user.avatar,
    });
  } catch (err) {
    console.error("Google login error:", err);
    res.status(500).json({ error: "Google authentication failed" });
  }
});

export default router;
