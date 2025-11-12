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

let token = localStorage.getItem("token");
let username = localStorage.getItem("username");
const BASE_URL = window.location.origin; // ✅ Ensures correct domain (works on Vercel)

// 🔄 Toggle forms
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

// 🧩 Register
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

// 🔐 Login
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
      showChatUI();
    } else {
      authMsg.textContent = data.error || "Login failed.";
    }
  } catch (err) {
    console.error(err);
    authMsg.textContent = "Network error.";
  }
});

// 🧠 Show chat and load history
async function showChatUI() {
  authSection.classList.add("hidden");
  chatContainer.classList.remove("hidden");
  welcomeEl.textContent = `Welcome, ${username}`;
  await loadHistory();
}

// 💾 Load chat history
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
    chatLog.innerHTML = `<div class="text-sm text-red-400 text-center p-4">Failed to load history.</div>`;
  }
}

// 💬 Append message
function appendMsg(sender, text) {
  const wrapper = document.createElement("div");
  wrapper.className = `flex ${sender === "user" ? "justify-end" : "justify-start"}`;
  const bubble = document.createElement("div");
  bubble.className = `max-w-[75%] px-4 py-3 rounded-2xl shadow-md ${
    sender === "user"
      ? "bg-gradient-to-r from-indigo-600 to-pink-600 text-white"
      : "bg-gray-800 text-gray-100"
  }`;
  bubble.innerHTML = text;
  wrapper.appendChild(bubble);
  chatLog.appendChild(wrapper);
  chatLog.scrollTo({ top: chatLog.scrollHeight, behavior: "smooth" });
}

// 🚀 Send message
sendBtn.addEventListener("click", sendMessage);
userInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

async function sendMessage() {
  const txt = userInput.value.trim();
  if (!txt) return;
  appendMsg("user", txt);
  userInput.value = "";

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

// 🚪 Logout
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  token = null;
  username = null;
  chatLog.innerHTML = "";
  chatContainer.classList.add("hidden");
  authSection.classList.remove("hidden");
});

// 🧹 Clear history
clearHistoryBtn.addEventListener("click", async () => {
  if (!confirm("Are you sure you want to clear your chat history?")) return;
  try {
    const res = await fetch(`${BASE_URL}/api/ai/clear`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
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

// ♻️ Auto-login
window.addEventListener("load", () => {
  token = localStorage.getItem("token");
  username = localStorage.getItem("username");
  if (token && username) showChatUI();
});
