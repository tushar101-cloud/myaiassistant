// public/script.js
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const showRegisterBtn = document.getElementById("show-register");
const showLoginBtn = document.getElementById("show-login");
const authMsg = document.getElementById("auth-msg");

const loginUsername = document.getElementById("login-username");
const loginPassword = document.getElementById("login-password");
const registerUsername = document.getElementById("register-username");
const registerPassword = document.getElementById("register-password");
const loginBtn = document.getElementById("login-btn");
const registerBtn = document.getElementById("register-btn");

const chatContainer = document.getElementById("chat-container");
const authSection = document.getElementById("auth-section");
const welcomeEl = document.getElementById("welcome");
const chatLog = document.getElementById("chat-log");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const logoutBtn = document.getElementById("logout-btn");
const clearHistoryBtn = document.getElementById("clear-history");
const userAvatarEl = document.getElementById("user-avatar");

const attachBtn = document.getElementById("attach-btn");
const fileInput = document.getElementById("file-input");
const voiceBtn = document.getElementById("voice-btn");

let token = localStorage.getItem("token");
let username = localStorage.getItem("username");
const BASE_URL = window.location.origin;

// Toggle forms
showRegisterBtn.addEventListener("click", () => {
  loginForm.classList.add("hidden");
  registerForm.classList.remove("hidden");
  authMsg.textContent = "";
});
showLoginBtn.addEventListener("click", () => {
  registerForm.classList.add("hidden");
  loginForm.classList.remove("hidden");
  authMsg.textContent = "";
});

// Register
registerBtn.addEventListener("click", async () => {
  const u = registerUsername.value.trim();
  const p = registerPassword.value.trim();
  if (!u || !p) return (authMsg.textContent = "Enter username & password");

  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: u, password: p }),
    });
    const data = await res.json();
    if (res.ok) {
      authMsg.textContent = "✅ Account created. You can log in now.";
      registerForm.classList.add("hidden");
      loginForm.classList.remove("hidden");
    } else {
      authMsg.textContent = data.error || "Registration failed.";
    }
  } catch (err) {
    console.error(err);
    authMsg.textContent = "Network error.";
  }
});

// Login
loginBtn.addEventListener("click", async () => {
  const u = loginUsername.value.trim();
  const p = loginPassword.value.trim();
  if (!u || !p) return (authMsg.textContent = "Enter username & password");

  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: u, password: p }),
    });
    const data = await res.json();
    if (res.ok && data.token) {
      token = data.token;
      username = data.username || u;
      localStorage.setItem("token", token);
      localStorage.setItem("username", username);
      await showChatUI();
    } else {
      authMsg.textContent = data.error || "Login failed.";
    }
  } catch (err) {
    console.error(err);
    authMsg.textContent = "Network error.";
  }
});

// Show chat and load history
async function showChatUI() {
  authSection.classList.add("hidden");
  chatContainer.classList.remove("hidden");
  welcomeEl.textContent = `Welcome, ${username}`;
  await loadHistory();
  await loadAvatar();
}

// Load avatar
async function loadAvatar() {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.user?.avatar) userAvatarEl.src = data.user.avatar;
  } catch (err) {
    console.warn("Failed to load avatar", err);
  }
}

// Load chat history
async function loadHistory() {
  chatLog.innerHTML = `<div class="text-sm text-gray-400 text-center p-4">Loading history...</div>`;
  try {
    const res = await fetch(`${BASE_URL}/api/ai/history`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    chatLog.innerHTML = "";
    if (data.history && data.history.length) {
      data.history.forEach((entry) => {
        appendMsg("user", entry.input);
        appendMsg("ai", entry.response);
      });
    } else {
      appendMsg("ai", "👋 Hello — I am your personal assistant. How can I help?");
    }
  } catch (err) {
    console.error(err);
    chatLog.innerHTML = `<div class="text-sm text-red-400 text-center p-4">Failed to load history</div>`;
  }
}

// Append message bubble
function appendMsg(sender, text) {
  const wrapper = document.createElement("div");
  wrapper.className = `flex ${sender === "user" ? "justify-end" : "justify-start"}`;
  const bubble = document.createElement("div");
  bubble.className = `max-w-[75%] px-4 py-3 rounded-2xl shadow-md ${sender === "user" ? "bg-gradient-to-r from-indigo-600 to-pink-600 text-white" : "bg-gray-800 text-gray-100"}`;
  bubble.innerHTML = text;
  wrapper.appendChild(bubble);
  chatLog.appendChild(wrapper);
  chatLog.scrollTo({ top: chatLog.scrollHeight, behavior: "smooth" });
}

// Send message
sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(); });

async function sendMessage() {
  const txt = userInput.value.trim();
  if (!txt) return;
  appendMsg("user", txt);
  userInput.value = "";

  // show typing indicator
  const typing = document.createElement("div");
  typing.className = "text-sm text-gray-400";
  typing.id = "typing-indicator";
  typing.innerText = "Typing...";
  chatLog.appendChild(typing);
  chatLog.scrollTo({ top: chatLog.scrollHeight, behavior: "smooth" });

  try {
    const res = await fetch(`${BASE_URL}/api/ai/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message: txt }),
    });
    const data = await res.json();
    document.getElementById("typing-indicator")?.remove();
    appendMsg("ai", data.reply || "⚠️ No response");
  } catch (err) {
    console.error(err);
    document.getElementById("typing-indicator")?.remove();
    appendMsg("ai", "❌ Network error");
  }
}

// Logout
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  token = null;
  username = null;
  chatLog.innerHTML = "";
  chatContainer.classList.add("hidden");
  authSection.classList.remove("hidden");
});

// Clear history (delete memory in DB)
clearHistoryBtn.addEventListener("click", async () => {
  if (!confirm("Are you sure you want to clear your chat history? This cannot be undone.")) return;
  try {
    const res = await fetch(`${BASE_URL}/api/ai/clear`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` }});
    if (res.ok) {
      chatLog.innerHTML = "";
      appendMsg("ai", "✅ Chat history cleared.");
    } else {
      appendMsg("ai", "⚠️ Failed to clear history.");
    }
  } catch (err) {
    console.error(err);
    appendMsg("ai", "⚠️ Network error.");
  }
});

// File upload (attachments)
attachBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append("file", file);

  appendMsg("user", `📎 Uploaded: ${file.name}`);

  try {
    const res = await fetch(`${BASE_URL}/api/upload/file`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    if (data.url) {
      appendMsg("ai", `✅ File uploaded! <a href="${data.url}" target="_blank" class="underline">View</a>`);
    } else appendMsg("ai", "⚠️ Upload failed");
  } catch (err) {
    console.error(err);
    appendMsg("ai", "❌ Network error during upload");
  } finally {
    fileInput.value = "";
  }
});

// Voice input (Web Speech API)
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  const recog = new SpeechRecognition();
  recog.lang = "en-US";
  recog.interimResults = false;

  voiceBtn.addEventListener("click", () => {
    try {
      recog.start();
      appendMsg("ai", "🎙️ Listening...");
    } catch (e) {
      appendMsg("ai", "⚠️ Voice recognition not available.");
    }
  });

  recog.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    userInput.value = transcript;
    sendMessage();
  };

  recog.onerror = (err) => {
    console.error("Speech error:", err);
    appendMsg("ai", "⚠️ Voice recognition error");
  };
} else {
  voiceBtn.classList.add("opacity-50");
  voiceBtn.title = "Voice not supported in this browser";
}

// Auto-show if already logged in
window.addEventListener("load", () => {
  token = localStorage.getItem("token");
  username = localStorage.getItem("username");
  if (token && username) showChatUI();
});
