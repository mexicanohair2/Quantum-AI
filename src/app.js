import { searchWeb } from "./web-search.js";

const $ = (id) => document.getElementById(id);
const STORE_KEY = "quantum-ai-workspace-v1";
const LEGACY_KEY = "quantum-ai-chat-v2";
const MAX_CHATS = 80;
const MAX_MESSAGES = 120;
const SEARCH_HISTORY_KEY = "quantum-ai-web-search-history-v1";

let state = loadWorkspace();
let currentView = "chat";
let currentResults = [];
let currentSearchQuery = "";
let searchBusy = false;
let searchError = "";
let searchTopic = "general";
let searchRequestId = 0;

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
      const conversations = saved.conversations
        .filter((chat) => chat && typeof chat.id === "string")
        .slice(-MAX_CHATS)
        .map((chat) => ({
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

  // Import the previous single-thread history without deleting its original backup.
  try {
    const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || "[]");
    const messages = cleanMessages(legacy);
    if (messages.length) {
      const createdAt = Date.now();
      const firstUserMessage = messages.find((message) => message.role === "user");
      const conversation = {
        id: makeId(),
        title: titleFromText(firstUserMessage ? firstUserMessage.content : "Импортированный разговор"),
        createdAt,
        updatedAt: createdAt,
        messages
      };
      return { conversations: [conversation], activeId: conversation.id };
    }
  } catch (_) {}

  return { conversations: [], activeId: null };
}

function saveWorkspace() {
  try {
    state.conversations = state.conversations.slice(-MAX_CHATS);
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
    renderHistory();
  } catch (_) {
    setSearchState("Не удалось сохранить историю: в браузере недостаточно места.", "");
  }
}

function titleFromText(text) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!value) return "Новый чат";
  return value.length > 38 ? value.slice(0, 37).trimEnd() + "…" : value;
}

function activeConversation() {
  return state.conversations.find((chat) => chat.id === state.activeId) || null;
}

function setView(view) {
  currentView = view === "search" ? "search" : "chat";
  $("chatView").hidden = currentView !== "chat";
  $("searchView").hidden = currentView !== "search";
  $("chatNav").classList.toggle("active", currentView === "chat");
  $("webSearchNav").classList.toggle("active", currentView === "search");

  if (currentView === "search") {
    $("viewKicker").textContent = "ОТКРЫТЫЕ ИСТОЧНИКИ";
    $("viewTitle").textContent = "Поиск в интернете";
    requestAnimationFrame(() => $("webQuery").focus());
  } else {
    $("viewKicker").textContent = "ЛИЧНОЕ ПРОСТРАНСТВО";
    const chat = activeConversation();
    $("viewTitle").textContent = chat ? chat.title : "Новый разговор";
  }
  closeSidebar();
}

function createChat() {
  const now = Date.now();
  const chat = { id: makeId(), title: "Новый чат", createdAt: now, updatedAt: now, messages: [] };
  state.conversations.unshift(chat);
  state.activeId = chat.id;
  saveWorkspace();
  renderCurrentChat();
  setView("chat");
}

function openChat(id) {
  if (!state.conversations.some((chat) => chat.id === id)) return;
  state.activeId = id;
  saveWorkspace();
  renderCurrentChat();
  setView("chat");
}

function renderHistory() {
  const host = $("chatHistory");
  const filter = $("chatFilter").value.trim().toLocaleLowerCase("ru");
  const sorted = [...state.conversations].sort((a, b) => b.updatedAt - a.updatedAt);
  const matching = sorted.filter((chat) => {
    if (!filter) return true;
    return chat.title.toLocaleLowerCase("ru").includes(filter) ||
      chat.messages.some((message) => message.content.toLocaleLowerCase("ru").includes(filter));
  });

  $("historyCount").textContent = String(state.conversations.length);
  host.replaceChildren();

  if (!matching.length) {
    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.textContent = filter ? "Ничего не найдено" : "Здесь будут отображаться сохранённые разговоры.";
    host.append(empty);
    return;
  }

  matching.forEach((chat) => {
    const row = document.createElement("div");
    row.className = "history-item" + (chat.id === state.activeId && currentView === "chat" ? " active" : "");
    const open = document.createElement("button");
    open.type = "button";
    open.className = "history-open";
    open.dataset.action = "open";
    open.dataset.id = chat.id;

    const title = document.createElement("span");
    title.className = "history-title";
    title.textContent = chat.title;
    const date = document.createElement("span");
    date.className = "history-date";
    date.textContent = formatDate(chat.updatedAt);
    open.append(title, date);

    const rename = document.createElement("button");
    rename.type = "button";
    rename.className = "history-action";
    rename.dataset.action = "rename";
    rename.dataset.id = chat.id;
    rename.title = "Переименовать чат";
    rename.setAttribute("aria-label", "Переименовать чат");
    rename.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m14 5 5 5M4 20l4.2-.8L19 8.4a2.1 2.1 0 0 0-3-3L5.2 16.2 4 20Z"/></svg>';

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "history-action";
    remove.dataset.action = "delete";
    remove.dataset.id = chat.id;
    remove.title = "Удалить чат";
    remove.setAttribute("aria-label", "Удалить чат");
    remove.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m3 4v5m6-5v5"/></svg>';

    row.append(open, rename, remove);
    host.append(row);
  });
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("ru-RU", sameYear ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });
}

function renderCurrentChat() {
  const chat = activeConversation();
  const host = $("threadMessages");
  host.replaceChildren();
  $("welcome").hidden = Boolean(chat && chat.messages.length);
  $("viewTitle").textContent = chat ? chat.title : "Новый разговор";
  $("exportBtn").disabled = !(chat && chat.messages.length);
  $("clearBtn").disabled = !(chat && chat.messages.length);

  if (chat) {
    chat.messages.forEach((message) => appendMessage(host, message));
  }
  $("chatScroll").scrollTop = $("chatScroll").scrollHeight;
  renderHistory();
}

function appendMessage(host, message) {
  const row = document.createElement("article");
  row.className = "message " + message.role;

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = message.role === "user" ? "Я" : "Q";

  const body = document.createElement("div");
  body.className = "message-body";
  const name = document.createElement("div");
  name.className = "message-name";
  name.textContent = message.role === "user" ? "Вы" : "Quantum-AI";
  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.textContent = message.content;
  body.append(name, bubble);
  row.append(avatar, body);

  if (message.sources && message.sources.length) {
    const sourceWrap = document.createElement("div");
    sourceWrap.className = "message-bubble";
    sourceWrap.style.marginTop = "7px";
    message.sources.forEach((source) => {
      if (!/^https?:\/\//i.test(source.url || "")) return;
      const link = document.createElement("a");
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = source.title || source.url;
      link.style.display = "block";
      link.style.color = "#dfb6c8";
      sourceWrap.append(link);
    });
    body.append(sourceWrap);
  }
  host.append(row);
}

function renameChat(id) {
  const chat = state.conversations.find((item) => item.id === id);
  if (!chat) return;
  const nextTitle = window.prompt("Название чата", chat.title);
  if (nextTitle === null) return;
  const title = nextTitle.replace(/\s+/g, " ").trim();
  if (!title) return;
  chat.title = title.slice(0, 70);
  chat.updatedAt = Date.now();
  saveWorkspace();
  renderCurrentChat();
}

function deleteChat(id) {
  const chat = state.conversations.find((item) => item.id === id);
  if (!chat) return;
  if (!window.confirm("Удалить чат «" + chat.title + "»? Это действие нельзя отменить.")) return;
  state.conversations = state.conversations.filter((item) => item.id !== id);
  if (state.activeId === id) {
    const next = [...state.conversations].sort((a, b) => b.updatedAt - a.updatedAt)[0];
    state.activeId = next ? next.id : null;
  }
  saveWorkspace();
  renderCurrentChat();
}

function exportActiveChat() {
  const chat = activeConversation();
  if (!chat || !chat.messages.length) return;
  const payload = {
    app: "Quantum-AI",
    exportedAt: new Date().toISOString(),
    conversation: chat
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "quantum-ai-" + chat.id + ".json";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function clearActiveChat() {
  const chat = activeConversation();
  if (!chat || !chat.messages.length) return;
  if (!window.confirm("Очистить сообщения в этом чате? Сам чат останется в истории.")) return;
  chat.messages = [];
  chat.title = "Новый чат";
  chat.updatedAt = Date.now();
  saveWorkspace();
  renderCurrentChat();
}

function openSidebar() {
  $("sidebar").classList.add("open");
  $("sidebarBackdrop").classList.add("visible");
}
function closeSidebar() {
  $("sidebar").classList.remove("open");
  $("sidebarBackdrop").classList.remove("visible");
}

function setSearchState(message, count) {
  $("searchState").querySelector("span").textContent = message;
  $("searchResultCount").textContent = count || "";
}

function saveSearchHistory(query) {
  try {
    const old = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || "[]");
    const updated = [query, ...(Array.isArray(old) ? old : []).filter((item) => item !== query)].slice(0, 12);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
  } catch (_) {}
}

function renderSearchResults() {
  const host = $("searchResults");
  host.replaceChildren();
  $("searchEmpty").hidden = true;

  if (searchBusy) {
    const loading = document.createElement("div");
    loading.className = "search-empty";
    const spinner = document.createElement("span");
    spinner.className = "spinner";
    spinner.style.display = "inline-block";
    spinner.style.verticalAlign = "middle";
    spinner.style.marginRight = "10px";
    loading.append(spinner, document.createTextNode("Ищем подходящие страницы…"));
    host.append(loading);
    return;
  }

  if (searchError) {
    const box = document.createElement("div");
    box.className = "search-empty";
    const text = document.createElement("p");
    text.textContent = searchError;
    const fallback = document.createElement("a");
    fallback.href = "https://www.google.com/search?q=" + encodeURIComponent(currentSearchQuery);
    fallback.target = "_blank";
    fallback.rel = "noopener noreferrer";
    fallback.className = "result-title";
    fallback.textContent = "Открыть этот запрос во внешнем поиске";
    box.append(text, fallback);
    host.append(box);
    return;
  }

  if (!currentResults.length && currentSearchQuery) {
    $("searchEmpty").hidden = false;
    return;
  }

  currentResults.forEach((result) => {
    const card = document.createElement("article");
    card.className = "search-result";

    const meta = document.createElement("div");
    meta.className = "result-meta";
    const favicon = document.createElement("span");
    favicon.className = "result-favicon";
    favicon.textContent = "↗";
    const domain = document.createElement("span");
    domain.className = "result-domain";
    try { domain.textContent = new URL(result.url).hostname.replace(/^www\./, ""); }
    catch (_) { domain.textContent = result.url; }
    meta.append(favicon, domain);

    const link = document.createElement("a");
    link.className = "result-title";
    link.href = result.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = result.title;

    const snippet = document.createElement("p");
    snippet.className = "result-snippet";
    snippet.textContent = result.content || "Открой страницу, чтобы прочитать материал.";

    card.append(meta, link, snippet);
    if (result.publishedDate) {
      const date = document.createElement("div");
      date.className = "result-date";
      date.textContent = "Дата публикации: " + result.publishedDate;
      card.append(date);
    }
    host.append(card);
  });
}

async function runWebSearch(query) {
  const cleanQuery = String(query || "").trim();
  if (!cleanQuery || searchBusy) return;
  const requestId = ++searchRequestId;
  currentSearchQuery = cleanQuery;
  searchResultsReset();
  searchBusy = true;
  searchError = "";
  $("webQuery").value = cleanQuery;
  $("searchSubmit").disabled = true;
  setSearchState("Ищем по открытым веб-источникам…", "");
  renderSearchResults();

  try {
    const response = await searchWeb(cleanQuery, { topic: searchTopic, maxResults: 7 });
    if (requestId !== searchRequestId) return;
    currentResults = response.results;
    saveSearchHistory(cleanQuery);
    searchBusy = false;
    setSearchState("Результаты по запросу: " + cleanQuery, currentResults.length ? currentResults.length + " страниц" : "");
  } catch (error) {
    if (requestId !== searchRequestId) return;
    searchBusy = false;
    searchError = error && error.message ? error.message : "Не удалось выполнить поиск.";
    setSearchState("Поиск не завершился", "");
  } finally {
    if (requestId === searchRequestId) {
      $("searchSubmit").disabled = false;
      renderSearchResults();
    }
  }
}

function searchResultsReset() {
  currentResults = [];
  searchError = "";
}

$("chatHistory").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const { action, id } = button.dataset;
  if (action === "open") openChat(id);
  if (action === "rename") renameChat(id);
  if (action === "delete") deleteChat(id);
});

$("newChatBtn").addEventListener("click", createChat);
$("chatNav").addEventListener("click", () => setView("chat"));
$("webSearchNav").addEventListener("click", () => setView("search"));
$("chatFilter").addEventListener("input", renderHistory);
$("menuBtn").addEventListener("click", openSidebar);
$("closeSidebarBtn").addEventListener("click", closeSidebar);
$("sidebarBackdrop").addEventListener("click", closeSidebar);
$("exportBtn").addEventListener("click", exportActiveChat);
$("clearBtn").addEventListener("click", clearActiveChat);

$("searchForm").addEventListener("submit", (event) => {
  event.preventDefault();
  runWebSearch($("webQuery").value);
});

document.querySelectorAll("[data-suggestion='web']").forEach((button) => {
  button.addEventListener("click", () => setView("search"));
});
document.querySelectorAll("[data-suggestion='history']").forEach((button) => {
  button.addEventListener("click", () => {
    $("chatFilter").focus();
    openSidebar();
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeSidebar();
  if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
    event.preventDefault();
    setView("search");
  }
});

function registerFreshAppShell() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" })
    .then((registration) => registration.update())
    .catch(() => {});
}

function initialize() {
  registerFreshAppShell();
  renderHistory();
  renderCurrentChat();
  setView("chat");
  $("prompt").disabled = true;
  $("sendBtn").disabled = true;
  $("prompt").placeholder = "Онлайн-чат станет доступен после подключения сервиса…";
}

initialize();
