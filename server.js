// server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

import aiRoutes from "./routes/ai.js";
import userRoutes from "./routes/user.js";
import avatarRoutes from "./routes/avatar.js";
import uploadRoutes from "./routes/upload.js";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public
app.use("/uploads", express.static("uploads"));


// Routes
app.use("/api/auth", userRoutes); // register/login, expose authenticate middleware
app.use("/api/ai", aiRoutes);
app.use("/api/avatar", avatarRoutes);
app.use("/api/upload", uploadRoutes);

// fallback to index.html for SPA-ish behavior
app.get("/", (req, res) => {
  res.sendFile(path.resolve("public/index.html"));
});

// MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// Start server (0.0.0.0 for hosts like Render)
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server running on port ${PORT}`));


