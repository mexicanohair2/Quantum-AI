const $ = (id) => document.getElementById(id);
const chat = $("chat");
const messagesEl = $("messages");
const welcome = $("welcome");
const STORAGE_KEY = "quantum-ai-chat-v2";
const MAX_MESSAGES = 48;

function loadHistory() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value.filter((m) => m && ["user","assistant"].includes(m.role) && typeof m.content === "string").slice(-MAX_MESSAGES) : [];
  } catch (_) { return []; }
}
let messages = loadHistory();

function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_MESSAGES))); }
  catch (_) { $("notice").textContent = "Не удалось сохранить историю в браузере."; }
}
function appendMessage(role, content) {
  const row = document.createElement("div");
  row.className = "message " + role;
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "user" ? "Я" : "Q";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = content;
  row.append(avatar, bubble);
  messagesEl.append(row);
  welcome.hidden = true;
  chat.scrollTop = chat.scrollHeight;
}
function renderHistory() {
  messagesEl.replaceChildren();
  messages.forEach((m) => appendMessage(m.role, m.content));
  welcome.hidden = messages.length > 0;
}
renderHistory();

$("clearBtn").addEventListener("click", () => {
  if (!window.confirm("Очистить историю диалога на этом устройстве?")) return;
  messages = [];
  persist();
  renderHistory();
  $("notice").textContent = "История очищена.";
});
$("exportBtn").addEventListener("click", () => {
  if (!messages.length) { $("notice").textContent = "Пока нечего экспортировать."; return; }
  const blob = new Blob([JSON.stringify({app:"Quantum-AI",exportedAt:new Date().toISOString(),messages},null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "quantum-ai-chat.json";
  link.click();
  URL.revokeObjectURL(url);
  $("notice").textContent = "История экспортирована.";
});
if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}), {once:true});
}
