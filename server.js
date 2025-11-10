// server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url"; // ✅ needed for ES module __dirname equivalent
import aiRoutes from "./routes/ai.js";
import userRoutes from "./routes/user.js";
import avatarRoutes from "./routes/avatar.js";
import uploadRoutes from "./routes/upload.js";

dotenv.config();

const app = express();

// ✅ Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Serve static uploads (user avatars, file uploads)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Serve static frontend files (important for Render deployment)
app.use(express.static(path.join(__dirname, "public")));

// ✅ API routes
app.use("/api/auth", userRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/avatar", avatarRoutes);
app.use("/api/upload", uploadRoutes);

// ✅ Root route (for backend testing)
app.get("/", (req, res) => {
  res.send("✅ AI Chatbot backend is running successfully.");
});

// ✅ Fallback to index.html (for frontend routing support)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ MongoDB connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// ✅ Start server (Render requires 0.0.0.0)
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
