// routes/ai.js
import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import { authenticate } from "./user.js";
import User from "../models/User.js";

dotenv.config();
const router = express.Router();

// Gemini setup
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;





// Google Custom Search setup
const GOOGLE_KEY = process.env.GOOGLE_SEARCH_KEY;
const GOOGLE_CX = process.env.GOOGLE_SEARCH_ENGINE_ID;

// 🧠 Fetch or create user memory
async function getUser(userId) {
  let user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  return user;
}

// 🌍 Google Search (real-time)
async function googleSearch(query) {
  try {
    const url = `https://www.googleapis.com/customsearch/v1`;
    const res = await axios.get(url, {
      params: { key: GOOGLE_KEY, cx: GOOGLE_CX, q: query },
    });

    if (res.data.items && res.data.items.length > 0) {
      return res.data.items
        .slice(0, 3)
        .map((item) => `${item.title}: ${item.snippet}`)
        .join("\n");
    }
    return "No relevant Google results found.";
  } catch (err) {
    console.warn("⚠️ Google Search failed:", err.message);
    return null;
  }
}

// 🌍 DuckDuckGo fallback
async function duckDuckSearch(query) {
  try {
    const res = await axios.get("https://api.duckduckgo.com/", {
      params: { q: query, format: "json", no_redirect: 1, no_html: 1 },
    });
    if (res.data.AbstractText) return res.data.AbstractText;
    if (res.data.RelatedTopics?.length)
      return res.data.RelatedTopics[0]?.Text || "No relevant results found.";
    return "No relevant results found.";
  } catch (err) {
    console.error("DuckDuckGo fallback failed:", err);
    return "Search temporarily unavailable.";
  }
}

// 💬 Basic responses
function basicResponse(message, name) {
  const msg = message.toLowerCase().trim();
  if (msg.includes("hello") || msg.includes("hi"))
    return `👋 Hello${name ? ", " + name : ""}! How can I assist you today?`;
  if (msg.includes("good morning"))
    return `🌞 Good morning${name ? ", " + name : ""}! Hope your day goes well.`;
  if (msg.includes("good night"))
    return `🌙 Good night${name ? ", " + name : ""}! Sleep well.`;
  if (msg.includes("how are you"))
    return "😊 I'm great, thanks for asking! How about you?";
  if (msg.includes("thank")) return "You're very welcome! 🙏";
  if (msg.includes("bye")) return "👋 Bye! Talk soon.";
  return null;
}

// 🧠 Chat with AI
router.post("/ask", authenticate, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.userId;

    if (!message) return res.status(400).json({ error: "Message required" });

    const user = await getUser(userId);
    const name = user.username;

    // Small talk
    const basic = basicResponse(message, name);
    if (basic) {
      user.memory.push({ input: message, response: basic });
      await user.save();
      return res.json({ reply: basic });
    }

    // Fetch real-time info
    console.log("🌍 Fetching Google results...");
    let webData = await googleSearch(message);
    if (!webData) webData = await duckDuckSearch(message);

    const history = user.memory
      .slice(-5)
      .map((m) => `User: ${m.input}\nAI: ${m.response}`)
      .join("\n");

    const prompt = `
You are a helpful, factually accurate AI assistant.
Always use reliable information and avoid speculation.
Recent context:
${history}

Web info:
${webData}

User: ${message}
`;

    // Ask Gemini
    const geminiRes = await axios.post(GEMINI_URL, {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const reply =
      geminiRes.data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I'm not sure how to respond right now.";

    // Save memory
    user.memory.push({ input: message, response: reply });
    await user.save();

    return res.json({ reply });
  } catch (err) {
    console.error("AI Error:", err.response?.data || err.message);
    res.status(500).json({ error: "AI request failed" });
  }
});

// 🧾 Get user chat history
router.get("/history", authenticate, async (req, res) => {
  try {
    const user = await getUser(req.userId);
    res.json({ history: user.memory });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// 🧹 Clear history
router.delete("/clear", authenticate, async (req, res) => {
  try {
    const user = await getUser(req.userId);
    user.memory = [];
    await user.save();
    res.json({ message: "Chat history cleared" });
  } catch (err) {
    res.status(500).json({ error: "Failed to clear history" });
  }
});

export default router;
