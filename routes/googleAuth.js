// routes/googleAuth.js
import express from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";

dotenv.config();
const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post("/google-login", async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { email, name, picture } = ticket.getPayload();

    let user = await User.findOne({ username: email });
    if (!user) {
      user = new User({ username: email, avatar: picture, password: "google-auth" });
      await user.save();
    }

    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token: jwtToken, username: user.username, avatar: user.avatar });
  } catch (err) {
    console.error("Google Login Error:", err);
    res.status(500).json({ error: "Google login failed" });
  }
});

export default router;
