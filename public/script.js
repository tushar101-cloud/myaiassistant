const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const showRegisterBtn = document.getElementById("show-register");
const showLoginBtn = document.getElementById("show-login");
const authMsg = document.getElementById("auth-msg");
const avatar = document.getElementById("avatar");
const attachBtn = document.getElementById("attach-btn");
const fileInput = document.getElementById("file-input");
const voiceBtn = document.getElementById("voice-btn");

let token = localStorage.getItem("token");
let username = localStorage.getItem("username");

// ✅ Handle Google login callback
window.handleGoogleLogin = async (response) => {
  try {
    // Decode the credential token (JWT from Google)
    const data = parseJwt(response.credential);
    const googlePayload = {
      googleId: data.sub,
      email: data.email,
      name: data.name,
      avatar: data.picture
    };

    // Send to backend
    const res = await fetch("/api/google/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(googlePayload)
    });

    const result = await res.json();

    if (res.ok && result.token) {
      localStorage.setItem("token", result.token);
      localStorage.setItem("username", result.username || result.email);
      if (result.avatar) localStorage.setItem("avatar", result.avatar);

      await showChatUI();
    } else {
      authMsg.textContent = result.error || "Google login failed.";
    }
  } catch (err) {
    console.error("Google login error:", err);
    authMsg.textContent = "⚠️ Google login failed.";
  }
};

// Utility to decode Google credential JWT
function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch (e) {
    console.error("Failed to decode Google JWT", e);
    return {};
  }
}

// Avatar upload
avatar.addEventListener("click", () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const res = await fetch("/api/avatar/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.url) avatar.src = data.url;
    } catch (err) {
      console.error("Avatar upload failed", err);
    }
  };
  input.click();
});

// Voice input
voiceBtn.addEventListener("click", () => {
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = "en-US";
  recognition.start();
  recognition.onresult = (e) => {
    document.getElementById("user-input").value = e.results[0][0].transcript;
  };
});

// File attachment
attachBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  appendMsg("user", `📎 Uploaded file: ${file.name}`);
  await sendMessage(`File content:\n${text}`);
});

// Send message
document.getElementById("send-btn").addEventListener("click", () => sendMessage());
document.getElementById("user-input").addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

async function sendMessage(customText) {
  const txt = customText || document.getElementById("user-input").value.trim();
  if (!txt) return;
  appendMsg("user", txt);
  document.getElementById("user-input").value = "";

  const typing = document.createElement("div");
  typing.id = "typing";
  typing.className = "text-gray-400 text-sm";
  typing.innerText = "Typing...";
  document.getElementById("chat-log").appendChild(typing);

  try {
    const res = await fetch("/api/ai/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message: txt }),
    });
    const data = await res.json();
    typing.remove();
    appendMsg("ai", data.reply || "⚠️ No response");
  } catch {
    typing.remove();
    appendMsg("ai", "❌ Network error");
  }
}

function appendMsg(sender, text) {
  const wrapper = document.createElement("div");
  wrapper.className = `flex ${sender === "user" ? "justify-end" : "justify-start"}`;
  const bubble = document.createElement("div");
  bubble.className = `max-w-[75%] px-4 py-3 rounded-2xl shadow-md ${sender === "user" ? "bg-gradient-to-r from-indigo-600 to-pink-600 text-white" : "bg-gray-800 text-gray-100"}`;
  bubble.innerHTML = text;
  wrapper.appendChild(bubble);
  document.getElementById("chat-log").appendChild(wrapper);
  document.getElementById("chat-log").scrollTo({ top: chatLog.scrollHeight, behavior: "smooth" });
}

function showChatUI() {
  document.getElementById("auth-section").classList.add("hidden");
  document.getElementById("chat-container").classList.remove("hidden");
  document.getElementById("welcome").textContent = `Welcome, ${username}`;
}

