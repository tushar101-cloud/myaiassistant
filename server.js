// server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// ✅ Load environment variables
dotenv.config();

// ✅ Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Import routes
import aiRoutes from "./routes/ai.js";
import userRoutes from "./routes/user.js";
import avatarRoutes from "./routes/avatar.js";
import uploadRoutes from "./routes/upload.js";
import googleAuthRoutes from "./routes/googleAuth.js"; // 👈 added properly here

// ✅ Initialize app
const app = express();

// ✅ Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Static folders
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "public")));

// ✅ API routes
app.use("/api/auth", userRoutes);         // manual register/login
app.use("/api/google", googleAuthRoutes); // google login
app.use("/api/ai", aiRoutes);             // AI chat
app.use("/api/avatar", avatarRoutes);
app.use("/api/upload", uploadRoutes);

// ✅ Root route (for quick test)
app.get("/", (req, res) => {
  res.send("✅ AI Chatbot backend is running successfully.");
});

// ✅ Universal fallback (safe for Render / SPA routing)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
