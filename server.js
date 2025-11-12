// server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// ✅ Initialize dotenv first
dotenv.config();

// ✅ Fix __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Import routes
import aiRoutes from "./routes/ai.js";
import userRoutes from "./routes/user.js";
import avatarRoutes from "./routes/avatar.js";
import uploadRoutes from "./routes/upload.js";
import googleAuthRoutes from "./routes/googleAuth.js"; // 👈 New route for Google login

// ✅ Initialize express app
const app = express();

// ✅ Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Serve static folders
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));

// ✅ API routes
app.use("/api/auth", userRoutes);         // Register/Login routes
app.use("/api/google", googleAuthRoutes); // Google OAuth login
app.use("/api/ai", aiRoutes);
app.use("/api/avatar", avatarRoutes);
app.use("/api/upload", uploadRoutes);

// ✅ Test route
app.get("/health", (req, res) => {
  res.send("✅ AI Chatbot backend running successfully");
});

// ✅ Fallback to index.html for SPA behavior
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
