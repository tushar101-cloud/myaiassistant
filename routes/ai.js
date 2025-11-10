// routes/ai.js
import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import { authenticate } from "./user.js";
import User from "../models/User.js";
import fs from "fs";
import path from "path";
import pkg from "pdf-parse";

const pdfParse = pkg;
dotenv.config();

const router = express.Router();

// -------------------- Gemini Setup --------------------
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// -------------------- Google Search Setup --------------------
const GOOGLE_KEY = process.env.GOOGLE_SEARCH_KEY;
const GOOGLE_CX = process.env.GOOGLE_SEARCH_ENGINE_ID;

// =======================================================
// 🧠 Fetch or Create User Memory
// =======================================================
async function getUser(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  return user;
}

// =======================================================
// 🌍 Google Search (primary)
// =======================================================
async function googleSearch(query) {
  try {
    const res = await axios.get("https://www.googleapis.com/customsearch/v1", {
      params: { key: GOOGLE_KEY, cx: GOOGLE_CX, q: query },
    });

    if (res.data.items && res.data.items.length > 0) {
      return res.data.items
        .slice(0, 3)
        .map((item) => `${item.title}: ${item.snippet}`)
        .join("\n");
    }
    return null;
  } catch (err) {
    console.warn("⚠️ Google Search failed:", err.message);
    return null;
  }
}

// =======================================================
// 🌐 DuckDuckGo Search (fallback)
// =======================================================
async function duckDuckSearch(query) {
  try {
    const res = await axios.get("https://api.duckduckgo.com/", {
      params: { q: query, format: "json", no_redirect: 1, no_html: 1 },
    });
    if (res.data.AbstractText) return res.data.AbstractText;
    if (res.data.RelatedTopics?.length)
      return res.data.RelatedTopics[0]?.Text || null;
    return null;
  } catch (err) {
    console.error("DuckDuckGo fallback failed:", err.message);
    return null;
  }
}

// =======================================================
// 💬 Basic Small Talk Responses
// =======================================================
function basicResponse(message, name) {
  const msg = message.toLowerCase().trim();
  if (msg.includes("hello") || msg.includes("hi"))
    return `👋 Hello${name ? ", " + name : ""}! How can I assist you today?`;
  if (msg.includes("good morning"))
    return `🌞 Good morning${name ? ", " + name : ""}! Hope your day goes well.`;
  if (msg.includes("good night"))
    return `🌙 Good night${name ? ", " + name : ""}! Sleep well.`;
  if (msg.includes("how are you"))
    return "😊 I'm doing great, thanks for asking! How about you?";
  if (msg.includes("thank")) return "You're very welcome! 🙏";
  if (msg.includes("bye")) return "👋 Bye! Talk soon.";
  return null;
}

// =======================================================
// 📂 Read Uploaded File Content (if any)
// =======================================================
async function readFileContent(filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".txt" || ext === ".json") {
      return fs.readFileSync(filePath, "utf8").slice(0, 2000); // limit length
    } else if (ext === ".pdf") {
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      return data.text.slice(0, 2000);
    }
    return "File type not supported for reading.";
  } catch (err) {
    console.error("File read error:", err.message);
    return "Could not read file content.";
  }
}

// =======================================================
// 🤖 Main Chat Endpoint
// =======================================================
router.post("/ask", authenticate, async (req, res) => {
  try {
    const { message, filePath } = req.body;
    const userId = req.userId;

    if (!message) return res.status(400).json({ error: "Message required." });

    const user = await getUser(userId);
    const name = user.username;

    // Handle small talk
    const basic = basicResponse(message, name);
    if (basic) {
      user.memory.push({ input: message, response: basic });
      await user.save();
      return res.json({ reply: basic });
    }

    // Optional: Read file context if present
    let fileContext = "";
    if (filePath && fs.existsSync(filePath)) {
      fileContext = await readFileContent(filePath);
    }

    // Real-time search
    console.log("🌍 Searching Google for:", message);
    let webData = await googleSearch(message);
    if (!webData) webData = await duckDuckSearch(message);
    if (!webData) webData = "No search results found.";

    // Retrieve chat history
    const history = user.memory
      .slice(-5)
      .map((m) => `User: ${m.input}\nAI: ${m.response}`)
      .join("\n");

    const prompt = `
You are a factual, friendly AI assistant.
Always use verified data and avoid speculation.

User name: ${name}
User avatar: ${user.avatar || "none"}

Recent context:
${history}

Web search info:
${webData}

${fileContext ? "File content provided:\n" + fileContext : ""}

User message:
${message}
`;

    // Send to Gemini
    const geminiRes = await axios.post(GEMINI_URL, {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const reply =
      geminiRes.data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "🤖 Sorry, I couldn’t process that.";

    // Save conversation
    user.memory.push({ input: message, response: reply });
    await user.save();

    return res.json({ reply });
  } catch (err) {
    console.error("AI Error:", err.response?.data || err.message);
    res.status(500).json({ error: "AI request failed." });
  }
});

// =======================================================
// 🧾 Get Chat History
// =======================================================
router.get("/history", authenticate, async (req, res) => {
  try {
    const user = await getUser(req.userId);
    res.json({ history: user.memory });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch history." });
  }
});

// =======================================================
// 🧹 Clear Chat History
// =======================================================
router.delete("/clear", authenticate, async (req, res) => {
  try {
    const user = await getUser(req.userId);
    user.memory = [];
    await user.save();
    res.json({ message: "Chat history cleared." });
  } catch (err) {
    res.status(500).json({ error: "Failed to clear history." });
  }
});

export default router;
