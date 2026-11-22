const $ = (id) => document.getElementById(id);
const STORE_KEY = "quantum-ai-workspace-v1";
const LEGACY_KEY = "quantum-ai-chat-v2";
const MAX_CHATS = 80;
const MAX_MESSAGES = 120;

// A real inference endpoint must be configured server-side before answers can be generated.
// Never put a provider secret in this public GitHub Pages application.
const CHAT_API_URL = "";

let state = loadWorkspace();

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
  return "chat-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
}

function cleanMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages.filter((item) => item && ["user", "assistant"].includes(item.role) && typeof item.content === "string")
    .slice(-MAX_MESSAGES)
    .map((item) => ({
      role: item.role,
      content: item.content.slice(0, 12000),
      sources: Array.isArray(item.sources) ? item.sources.filter((source) => source && typeof source.title === "string" && /^https?:\/\//i.test(source.url || "")).slice(0, 8) : []
    }));
}

function loadWorkspace() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (saved && Array.isArray(saved.conversations)) {
      const conversations = saved.conversations.filter((chat) => chat && typeof chat.id === "string").slice(-MAX_CHATS).map((chat) => ({
        id: chat.id,
        title: typeof chat.title === "string" && chat.title.trim() ? chat.title.slice(0, 70) : "Новый чат",
        createdAt: Number(chat.createdAt) || Date.now(),
        updatedAt: Number(chat.updatedAt) || Number(chat.createdAt) || Date.now(),
        messages: cleanMessages(chat.messages)
      }));
      const activeId = conversations.some((chat) => chat.id === saved.activeId) ? saved.activeId : (conversations[0]?.id || null);
      return { conversations, activeId };
    }
  } catch (_) {}

  // Preserve and import the previous chat history.
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || "[]");
    const messages = cleanMessages(legacy);
    if (messages.length) {
      const now = Date.now();
      const firstUser = messages.find((message) => message.role === "user");
      const chat = { id: makeId(), title: titleFromText(firstUser?.content || "Импортированный чат"), createdAt: now, updatedAt: now, messages };
      return { conversations: [chat], activeId: chat.id };
    }
  } catch (_) {}
  return { conversations: [], activeId: null };
}

function saveWorkspace() {
  state.conversations = state.conversations.slice(-MAX_CHATS);
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (_) {
    showError("Не удалось сохранить историю чатов в этом браузере.");
  }
  renderHistory();
}

function titleFromText(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "Новый чат";
  return text.length > 38 ? text.slice(0, 37).trimEnd() + "…" : text;
}

function activeConversation() {
  return state.conversations.find((chat) => chat.id === state.activeId) || null;
}

function ensureChat() {
  let chat = activeConversation();
  if (!chat) {
    const now = Date.now();
    chat = { id: makeId(), title: "Новый чат", createdAt: now, updatedAt: now, messages: [] };
    state.conversations.unshift(chat);
    state.activeId = chat.id;
  }
  return chat;
}

function showError(message) {
  const node = $("chatError");
  node.textContent = message;
  node.hidden = false;
}

function clearError() {
  $("chatError").hidden = true;
  $("chatError").textContent = "";
}

function renderHistory() {
  const host = $("chatHistory");
  host.replaceChildren();
  const chats = [...state.conversations].sort((a, b) => b.updatedAt - a.updatedAt);
  if (!chats.length) {
    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.textContent = "Пока нет чатов";
    host.append(empty);
    return;
  }
  chats.forEach((chat) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "history-item" + (chat.id === state.activeId ? " active" : "");
    button.dataset.id = chat.id;
    button.textContent = chat.title;
    host.append(button);
  });
}

function appendMessage(host, message) {
  const row = document.createElement("article");
  row.className = "message " + message.role;
  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.textContent = message.content;
  row.append(bubble);
  if (message.sources?.length) {
    const sources = document.createElement("div");
    sources.className = "message-sources";
    message.sources.forEach((source) => {
      if (!/^https?:\/\//i.test(source.url || "")) return;
      const link = document.createElement("a");
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = source.title || source.url;
      sources.append(link);
    });
    row.append(sources);
  }
  host.append(row);
}

function renderCurrentChat() {
  const chat = activeConversation();
  const host = $("threadMessages");
  host.replaceChildren();
  $("welcome").hidden = Boolean(chat?.messages.length);
  $("viewTitle").textContent = chat?.title || "Quantum-AI";
  if (chat) chat.messages.forEach((message) => appendMessage(host, message));
  $("chatScroll").scrollTop = $("chatScroll").scrollHeight;
  renderHistory();
}

function createChat() {
  const now = Date.now();
  const chat = { id: makeId(), title: "Новый чат", createdAt: now, updatedAt: now, messages: [] };
  state.conversations.unshift(chat);
  state.activeId = chat.id;
  clearError();
  saveWorkspace();
  renderCurrentChat();
  closeSidebar();
  $("prompt").focus();
}

function openChat(id) {
  if (!state.conversations.some((chat) => chat.id === id)) return;
  state.activeId = id;
  clearError();
  renderCurrentChat();
  closeSidebar();
}

async function requestAssistantReply(messages) {
  if (!CHAT_API_URL) {
    throw new Error("Ответы пока недоступны: сервер ИИ ещё не подключён.");
  }
  const response = await fetch(CHAT_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages })
  });
  if (!response.ok) throw new Error("Не удалось получить ответ. Попробуй ещё раз.");
  const data = await response.json();
  if (typeof data.reply !== "string" || !data.reply.trim()) throw new Error("Сервис вернул пустой ответ.");
  return { role: "assistant", content: data.reply.trim(), sources: Array.isArray(data.sources) ? data.sources : [] };
}

async function sendMessage() {
  const input = $("prompt");
  const text = input.value.trim();
  if (!text) return;
  clearError();
  const chat = ensureChat();
  const userMessage = { role: "user", content: text };
  input.value = "";
  resizePrompt();
  chat.messages.push(userMessage);
  if (chat.messages.filter((message) => message.role === "user").length === 1) chat.title = titleFromText(text);
  chat.updatedAt = Date.now();
  saveWorkspace();
  renderCurrentChat();

  try {
    const reply = await requestAssistantReply(chat.messages.slice(-24));
    chat.messages.push(reply);
    chat.updatedAt = Date.now();
    saveWorkspace();
    renderCurrentChat();
  } catch (error) {
    showError(error instanceof Error ? error.message : "Не удалось получить ответ.");
    input.value = text;
    resizePrompt();
  }
}

function resizePrompt() {
  const input = $("prompt");
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 150) + "px";
  $("sendBtn").disabled = !input.value.trim();
}

function openSidebar() {
  $("sidebar").classList.add("open");
  $("sidebarBackdrop").classList.add("visible");
}
function closeSidebar() {
  $("sidebar").classList.remove("open");
  $("sidebarBackdrop").classList.remove("visible");
}

$("chatHistory").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-id]");
  if (button) openChat(button.dataset.id);
});
$("newChatBtn").addEventListener("click", createChat);
$("menuBtn").addEventListener("click", openSidebar);
$("closeSidebarBtn").addEventListener("click", closeSidebar);
$("sidebarBackdrop").addEventListener("click", closeSidebar);
$("messageForm").addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage();
});
$("prompt").addEventListener("input", resizePrompt);
$("prompt").addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    if (!$("sendBtn").disabled) sendMessage();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeSidebar();
});

function initialize() {
  renderCurrentChat();
  resizePrompt();
  $("prompt").focus({ preventScroll: true });
}
initialize();
