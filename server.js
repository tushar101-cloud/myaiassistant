// server.js
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

import aiRoutes from "./routes/ai.js";
import userRoutes from "./routes/user.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// Routes
app.use("/api/auth", userRoutes); // register/login endpoints + authenticate middleware exported
app.use("/api/ai", aiRoutes); // protected ai routes

// Serve index
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server running on port ${PORT}`));
