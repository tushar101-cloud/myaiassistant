// routes/ai.js
import express from "express";
import dotenv from "dotenv";
import axios from "axios";
import User from "../models/User.js";
import Knowledge from "../models/Knowledge.js"; // optional: create if you want persistent KB
import { authenticate } from "./user.js";

dotenv.config();
const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-pro";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// Simple web search fallback (DuckDuckGo)
async function webSearch(query) {
  try {
    const res = await axios.get("https://api.duckduckgo.com/", {
      params: { q: query, format: "json", no_redirect: 1, no_html: 1 },
    });
    if (res.data.AbstractText) return res.data.AbstractText;
    if (res.data.RelatedTopics?.length) return res.data.RelatedTopics[0]?.Text || "";
    return "";
  } catch (err) {
    console.error("Web search failed:", err.message);
    return "";
  }
}

// GET /api/ai/history - returns user's stored memory (array)
router.get("/history", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ history: user.memory || [] });
  } catch (err) {
    console.error("History load failed:", err);
    return res.status(500).json({ error: "Failed to load history" });
  }
});

// POST /api/ai/ask - protected: sends prompt to Gemini, saves memory
router.post("/ask", authenticate, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "Message required" });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Basic small-talk catch (fast local responses)
    const m = message.toLowerCase();
    if (m.includes("hello") || m.includes("hi") || m.includes("good morning") || m.includes("good night")) {
      const basic = m.includes("good morning")
        ? `🌞 Good morning${user.username ? ", " + user.username : ""}!`
        : m.includes("good night")
        ? `🌙 Good night${user.username ? ", " + user.username : ""}!`
        : `👋 Hello${user.username ? ", " + user.username : ""}!`;
      user.memory.push({ input: message, response: basic });
      await user.save();
      return res.json({ reply: basic });
    }

    // Check local Knowledge DB (optional)
    if (Knowledge) {
      const existing = await Knowledge.findOne({ query: { $regex: message, $options: "i" } });
      if (existing) {
        user.memory.push({ input: message, response: existing.answer });
        await user.save();
        return res.json({ reply: existing.answer });
      }
    }

    // Build prompt with recent user memory (last 8 messages) + web fallback
    const history = (user.memory || [])
      .slice(-8)
      .map((m) => `User: ${m.input}\nAI: ${m.response}`)
      .join("\n");

    const webInfo = await webSearch(message);
    const systemPrompt = `
You are a helpful, concise, and respectful personal AI assistant for the user ${user.username || "user"}.
If a question is political, sexual, or otherwise sensitive, respond with: "⚠️ Sorry, I can’t comment on that topic."
Use the context and web info sensibly.
`;

    const prompt = `${systemPrompt}

Recent conversation:
${history}

Web info:
${webInfo}

User: ${message}
AI:
`;

    // Call Gemini REST API
    let replyText;
    try {
      const response = await axios.post(GEMINI_ENDPOINT, {
        // request body as per REST API: contents -> parts -> text
        contents: [{ parts: [{ text: prompt }] }],
        // optional generation config
        // generationConfig: { temperature: 0.6, maxOutputTokens: 700 }
      });

      replyText =
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        (response.data?.error ? null : "I'm not sure how to respond right now.");
    } catch (err) {
      console.error("Gemini API error:", err.response?.data || err.message);
      // Fallback: return web search summary if available
      const fallback = webInfo || "⚠️ Sorry, I'm having trouble contacting the AI service right now.";
      replyText = `Here’s what I found: ${fallback}`;
    }

    // Save conversation to user memory + optional KB
    user.memory.push({ input: message, response: replyText });
    await user.save();

    if (typeof Knowledge !== "undefined" && !replyText.startsWith("Here’s what I found:")) {
      try {
        await Knowledge.create({ query: message, answer: replyText });
      } catch (e) {
        // ignore duplicate / other errors
      }
    }

    return res.json({ reply: replyText });
  } catch (err) {
    console.error("AI route error:", err);
    return res.status(500).json({ error: "AI processing failed" });
  }
});
// DELETE /api/ai/clear - clear user's memory
router.delete("/clear", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    user.memory = [];
    await user.save();
    return res.json({ message: "Cleared" });
  } catch (err) {
    console.error("Clear history failed:", err);
    return res.status(500).json({ error: "Failed to clear history" });
  }
});

export default router;
