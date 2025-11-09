import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import multer from "multer";
import fs from "fs";
import path from "path";
import pkg from "pdf-parse";
const pdf = pkg;
import mammoth from "mammoth";
import Tesseract from "tesseract.js";
import { authenticate } from "./user.js";
import User from "../models/User.js";

dotenv.config();
const router = express.Router();

// Ensure upload directory
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Multer for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// Gemini API
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// Google Custom Search
const GOOGLE_KEY = process.env.GOOGLE_SEARCH_KEY;
const GOOGLE_CX = process.env.GOOGLE_SEARCH_ENGINE_ID;

// 🧠 Get user
async function getUser(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  return user;
}

// 🌍 Google Search
async function googleSearch(query) {
  try {
    const res = await axios.get("https://www.googleapis.com/customsearch/v1", {
      params: { key: GOOGLE_KEY, cx: GOOGLE_CX, q: query },
    });
    if (res.data.items?.length) {
      return res.data.items
        .slice(0, 3)
        .map((i) => `${i.title}: ${i.snippet}`)
        .join("\n");
    }
    return null;
  } catch (err) {
    console.warn("⚠️ Google Search failed:", err.message);
    return null;
  }
}

// 🧩 Extract file text
async function extractFileText(filePath, mimeType) {
  const ext = path.extname(filePath).toLowerCase();
  try {
    if (ext === ".pdf") {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      return data.text.slice(0, 3000); // limit for API
    } else if (ext === ".docx") {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value.slice(0, 3000);
    } else if (ext === ".txt") {
      return fs.readFileSync(filePath, "utf8").slice(0, 3000);
    } else if (mimeType.startsWith("image/")) {
      const { data: { text } } = await Tesseract.recognize(filePath, "eng");
      return text.slice(0, 2000);
    }
  } catch (err) {
    console.error("File parse error:", err);
  }
  return "Could not extract readable text from file.";
}

// 💬 Basic greetings
function basicResponse(msg, name) {
  const m = msg.toLowerCase();
  if (m.includes("hello") || m.includes("hi"))
    return `👋 Hello${name ? ", " + name : ""}! How can I help today?`;
  if (m.includes("thank")) return "You're very welcome! 🙏";
  if (m.includes("bye")) return "👋 Bye! Talk soon.";
  return null;
}

// 🧠 Chat Endpoint
router.post("/ask", authenticate, upload.single("file"), async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.userId;
    const file = req.file;

    if (!message && !file)
      return res.status(400).json({ error: "Message or file required" });

    const user = await getUser(userId);
    const basic = basicResponse(message || "", user.username);
    if (basic && !file) {
      user.memory.push({ input: message, response: basic });
      await user.save();
      return res.json({ reply: basic });
    }

    let fileText = "";
    if (file) {
      fileText = await extractFileText(file.path, file.mimetype);
    }

    let webData = await googleSearch(message || "");
    const history = user.memory
      .slice(-5)
      .map((m) => `User: ${m.input}\nAI: ${m.response}`)
      .join("\n");

    const prompt = `
You are a helpful AI assistant with access to real-time information.
Use factual and up-to-date knowledge.

Recent chat:
${history}

${file ? `User uploaded file: ${file.originalname}\nExtracted content:\n${fileText}` : ""}
Web context:
${webData || "No web data."}

User: ${message}
`;

    const gemini = await axios.post(GEMINI_URL, {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const reply =
      gemini.data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "⚠️ I couldn’t generate a response.";

    user.memory.push({ input: message || file?.originalname, response: reply });
    await user.save();

    res.json({ reply });
  } catch (err) {
    console.error("AI Error:", err.response?.data || err.message);
    res.status(500).json({ error: "AI processing failed" });
  }
});

export default router;


