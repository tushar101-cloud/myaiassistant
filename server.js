// server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import aiRoutes from "./routes/ai.js";
import userRoutes from "./routes/user.js";
import avatarRoutes from "./routes/avatar.js";
import uploadRoutes from "./routes/upload.js";
import googleAuthRoutes from "./routes/googleAuth.js";

dotenv.config();

const app = express();

// ✅ Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Static folders
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));

// ✅ API routes
app.use("/api/auth", userRoutes);          // Register/Login
app.use("/api/google", googleAuthRoutes);  // Google Sign-in
app.use("/api/ai", aiRoutes);              // AI assistant
app.use("/api/avatar", avatarRoutes);      // Avatar upload/fetch
app.use("/api/upload", uploadRoutes);      // File attachments

// ✅ Health check
app.get("/health", (req, res) => {
  res.json({ status: "✅ OK", message: "AI Assistant backend running" });
});

// ✅ Catch-all (MUST be last, safe for Express 5)
app.use((req, res, next) => {
  if (req.method === "GET") {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  } else {
    next();
  }
});

// ✅ MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, { dbName: "aiassistant" })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
