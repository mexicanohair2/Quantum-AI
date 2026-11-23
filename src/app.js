const $ = (id) => document.getElementById(id);
const API = "https://quantum-ai-chat-api.qq-ai-cloud.workers.dev";
const SUPABASE_URL = "https://lzpkronttfzbubbfggsb.supabase.co";
const SUPABASE_KEY = "sb_publishable_2PD3wYGG1aYoxRqhyM8wMA_OIQrwm3k";
const QQCROSS_URL = "https://mexicanohair2.github.io/QQCross/";
const STORE_KEY_PREFIX = "quantum-ai-workspace-v1:";
const LEGACY_KEY = "quantum-ai-chat-v2";
const MAX_CHATS = 80;
const MAX_MESSAGES = 120;
const MAX_REQUEST_MESSAGES = 8;
const REQUEST_TIMEOUT_MS = 90000;

let currentUserId = "";
let authClient = null;
let authSequence = 0;
let state = { conversations: [], activeId: null, ready: false, busy: false, quota: null };

function workspaceKey() {
  return STORE_KEY_PREFIX + currentUserId;
}

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

function emptyWorkspace() {
  return { conversations: [], activeId: null, ready: false, busy: false, quota: null };
}

function loadWorkspace() {
  try {
    const saved = JSON.parse(localStorage.getItem(workspaceKey()) || "null");
    if (saved && Array.isArray(saved.conversations)) {
      const conversations = saved.conversations.filter((chat) => chat && typeof chat.id === "string").slice(-MAX_CHATS).map((chat) => ({
        id: chat.id,
        title: typeof chat.title === "string" && chat.title.trim() ? chat.title.slice(0, 70) : "Новый чат",
        createdAt: Number(chat.createdAt) || Date.now(),
        updatedAt: Number(chat.updatedAt) || Number(chat.createdAt) || Date.now(),
        messages: cleanMessages(chat.messages)
      }));
      const activeId = conversations.some((chat) => chat.id === saved.activeId) ? saved.activeId : (conversations[0]?.id || null);
      return { conversations, activeId, ready: false, busy: false, quota: null };
    }
  } catch (_) {}

  // Import the previous local history into the first authenticated workspace only.
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || "[]");
    const messages = cleanMessages(legacy);
    if (messages.length) {
      const now = Date.now();
      const firstUser = messages.find((message) => message.role === "user");
      const chat = { id: makeId(), title: titleFromText(firstUser?.content || "Импортированный чат"), createdAt: now, updatedAt: now, messages };
      return { conversations: [chat], activeId: chat.id, ready: false, busy: false, quota: null };
    }
  } catch (_) {}
  return emptyWorkspace();
}

function saveWorkspace() {
  if (!currentUserId) return;
  state.conversations = state.conversations.slice(-MAX_CHATS);
  try {
    localStorage.setItem(workspaceKey(), JSON.stringify({
      conversations: state.conversations,
      activeId: state.activeId
    }));
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

function setAuthStatus(message, kind = "") {
  const node = $("authStatus");
  if (!node) return;
  node.textContent = message;
  node.dataset.state = kind;
}

function setLoginLink(visible) {
  const link = $("loginLink");
  if (link) link.hidden = !visible;
}

function showError(message, needsLogin = false) {
  const node = $("chatError");
  node.textContent = message;
  node.hidden = false;
  setLoginLink(needsLogin);
}

function clearError() {
  $("chatError").hidden = true;
  $("chatError").textContent = "";
  setLoginLink(false);
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

function updateComposer() {
  const enabled = state.ready && !state.busy;
  $("prompt").disabled = !enabled;
  $("sendBtn").disabled = !enabled || !(
    $("prompt").value.trim()
  );
  $("newChatBtn").disabled = !state.ready;
}

function createChat() {
  if (!state.ready) return;
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

async function apiRequest(path, options = {}) {
  if (!authClient || !currentUserId) throw new Error("Войди в подтверждённый аккаунт QQCross.");
  const { data, error } = await authClient.auth.getSession();
  if (error) throw new Error("Не удалось обновить сессию QQCross. Войди снова.");
  const session = data?.session;
  if (!session?.access_token || session.user?.id !== currentUserId) {
    throw new Error("Сессия QQCross завершилась. Войди снова.");
  }
  const headers = { ...(options.headers || {}), Authorization: "Bearer " + session.access_token };
  if (options.body) headers["Content-Type"] = "application/json";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(API + path, {
      ...options,
      headers,
      signal: controller.signal,
      cache: "no-store"
    });
    let result = {};
    try { result = await response.json(); } catch (_) {}
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error(result.error || "Сессия QQCross недействительна. Войди снова.");
      }
      throw new Error(result.error || "Quantum-AI временно недоступна. Попробуй позже.");
    }
    return result;
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("Сервер не ответил за 90 секунд. Проверь соединение и повтори запрос.");
    if (error instanceof TypeError) throw new Error("Нет соединения с сервером. Проверь интернет и повтори запрос.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function refreshQuota() {
  const data = await apiRequest("/api/balance");
  state.quota = data.quota || null;
  const node = $("authStatus");
  if (node && state.quota) {
    node.textContent = Number(state.quota.remaining).toLocaleString("ru-RU") + " нейронов";
    node.dataset.state = "ready";
  }
}

async function applySession(session) {
  const sequence = ++authSequence;
  const user = session?.user;
  if (!session?.access_token || !user?.id) {
    currentUserId = "";
    state = emptyWorkspace();
    renderCurrentChat();
    setAuthStatus("Войди в QQCross", "warning");
    showError("Для работы Quantum-AI нужен существующий подтверждённый аккаунт QQCross.", true);
    updateComposer();
    return;
  }

  if (user.is_anonymous === true || !(user.email_confirmed_at || user.confirmed_at)) {
    currentUserId = "";
    state = emptyWorkspace();
    renderCurrentChat();
    setAuthStatus("Подтверди почту", "warning");
    showError("Для Quantum-AI нужен подтверждённый аккаунт QQCross с электронной почтой.", true);
    updateComposer();
    return;
  }

  const changedUser = currentUserId !== user.id;
  currentUserId = user.id;
  if (changedUser) state = loadWorkspace();
  state.ready = false;
  state.quota = null;
  renderCurrentChat();
  setAuthStatus("Проверяем сервер…", "loading");
  clearError();
  updateComposer();

  try {
    const health = await fetch(API + "/health", { cache: "no-store" });
    if (!health.ok) throw new Error("Worker недоступен.");
    await refreshQuota();
    if (sequence !== authSequence) return;
    state.ready = true;
    setAuthStatus(Number(state.quota?.remaining ?? 0).toLocaleString("ru-RU") + " нейронов", "ready");
    clearError();
  } catch (error) {
    if (sequence !== authSequence) return;
    state.ready = false;
    setAuthStatus("Нет соединения", "warning");
    showError(error instanceof Error ? error.message : "Не удалось подключиться к Quantum-AI.");
  }
  updateComposer();
}

async function initializeAuth() {
  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    setAuthStatus("Авторизация не загрузилась", "warning");
    showError("Не удалось загрузить Supabase. Проверь интернет и обнови страницу.");
    updateComposer();
    return;
  }

  authClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: "implicit"
    }
  });

  const { data, error } = await authClient.auth.getSession();
  if (error) throw error;
  await applySession(data?.session || null);

  authClient.auth.onAuthStateChange((_event, session) => {
    // Avoid awaiting network work inside Supabase's auth event callback.
    Promise.resolve().then(() => applySession(session));
  });
}

function resizePrompt() {
  const input = $("prompt");
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 150) + "px";
  updateComposer();
}

async function sendMessage() {
  const input = $("prompt");
  const text = input.value.trim();
  if (!text || !state.ready || state.busy) return;

  state.busy = true;
  updateComposer();
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
    const result = await apiRequest("/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: chat.messages.slice(-MAX_REQUEST_MESSAGES).map(({ role, content }) => ({ role, content })) })
    });
    if (typeof result.reply !== "string" || !result.reply.trim()) throw new Error("Модель вернула пустой ответ.");
    chat.messages.push({
      role: "assistant",
      content: result.reply.trim(),
      sources: Array.isArray(result.sources) ? result.sources : []
    });
    chat.updatedAt = Date.now();
    state.quota = result.quota || state.quota;
    saveWorkspace();
    renderCurrentChat();
    if (state.quota) setAuthStatus(Number(state.quota.remaining).toLocaleString("ru-RU") + " нейронов", "ready");
  } catch (error) {
    chat.messages = chat.messages.filter((message) => message !== userMessage);
    showError(error instanceof Error ? error.message : "Не удалось получить ответ.");
    input.value = text;
    renderCurrentChat();
  } finally {
    state.busy = false;
    resizePrompt();
    updateComposer();
  }
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
  void sendMessage();
});
$("prompt").addEventListener("input", resizePrompt);
$("prompt").addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    if (!$("sendBtn").disabled) void sendMessage();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeSidebar();
});

function initialize() {
  renderCurrentChat();
  setAuthStatus("Проверяем аккаунт…", "loading");
  updateComposer();
  initializeAuth().catch((error) => {
    setAuthStatus("Ошибка авторизации", "warning");
    showError(error?.message || "Не удалось проверить аккаунт QQCross.");
    updateComposer();
  });
}
initialize();
