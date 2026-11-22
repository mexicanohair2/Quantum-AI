import { generateAnswer, loadLocalModel, searchWikipedia } from "./quantum-engine.js";

const $ = (id) => document.getElementById(id);
const chat = $("chat");
const messagesEl = $("messages");
const welcome = $("welcome");
const input = $("prompt");
const sendBtn = $("sendBtn");
const statusEl = $("status");
const statusText = $("statusText");
const notice = $("notice");
const loadBtn = $("loadModelBtn");
const setupTitle = $("setupTitle");
const setupDesc = $("setupDesc");
const progressWrap = $("modelProgress");
const progressBar = $("modelProgressBar");
const progressText = $("progressText");
const progressPercent = $("progressPercent");
const fileInput = $("fileInput");
const attachment = $("attachment");
const attachmentName = $("attachmentName");
const attachmentPreview = $("attachmentPreview");

const STORAGE_KEY = "quantum-ai-chat-v2";
const MAX_MESSAGES = 48;
let messages = [];
let busy = false;
let modelReady = false;
let searchMode = false;
let selectedFile = null;
let selectedFileText = "";
let selectedImageUrl = null;
let activeRecognition = null;

function safeLoad() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (Array.isArray(saved)) {
      return saved.filter((item) => item && ["user", "assistant"].includes(item.role) && typeof item.content === "string")
        .slice(-MAX_MESSAGES)
        .map((item) => ({
          role: item.role,
          content: item.content.slice(0, 12000),
          modelContent: typeof item.modelContent === "string" ? item.modelContent.slice(0, 14000) : item.content.slice(0, 12000),
          sources: Array.isArray(item.sources) ? item.sources.filter((s) => s && typeof s.title === "string" && typeof s.url === "string").slice(0, 4) : []
        }));
    }
  } catch (_) {}
  return [];
}
function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_MESSAGES))); }
  catch (_) { setNotice("Не удалось сохранить историю: браузеру не хватает места.", "error"); }
}
function setNotice(text, type) {
  notice.textContent = text || "";
  notice.className = "notice" + (type ? " " + type + "-text" : "");
}
function setStatus(text, state) {
  statusText.textContent = text;
  statusEl.className = "status" + (state ? " " + state : "");
}
function scrollBottom() { chat.scrollTop = chat.scrollHeight; }
function appendMessage(role, content, sources) {
  const row = document.createElement("div");
  row.className = "message " + role;
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "user" ? "Я" : "Q";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = content;
  row.append(avatar, bubble);
  messagesEl.appendChild(row);
  if (Array.isArray(sources) && sources.length) {
    const sourceRow = document.createElement("div");
    sourceRow.className = "message-tools";
    sources.forEach((source, index) => {
      const link = document.createElement("a");
      link.className = "source-link";
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = (index + 1) + ". " + source.title;
      sourceRow.appendChild(link);
    });
    row.appendChild(sourceRow);
  }
  welcome.hidden = true;
  scrollBottom();
  return { row: row, bubble: bubble };
}
function renderHistory() {
  messagesEl.replaceChildren();
  for (const message of messages) appendMessage(message.role, message.content, message.sources);
  welcome.hidden = messages.length > 0;
}
function setBusy(value) {
  busy = value;
  input.disabled = !modelReady || value;
  sendBtn.disabled = !modelReady || value || !input.value.trim();
  loadBtn.disabled = value || modelReady;
  $("attachBtn").disabled = value || !modelReady;
  $("micBtn").disabled = value || !modelReady;
}
function resizeInput() {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 135) + "px";
  sendBtn.disabled = !modelReady || busy || !input.value.trim();
}
function setProgress(item) {
  const message = item && (item.message || item.file || item.status) ? (item.message || item.file || item.status) : "Загружаем модель…";
  progressText.textContent = message;
  if (item && typeof item.progress === "number" && Number.isFinite(item.progress)) {
    const percent = Math.max(0, Math.min(100, item.progress));
    progressBar.style.width = percent + "%";
    progressPercent.textContent = Math.round(percent) + "%";
  } else {
    progressPercent.textContent = "Загрузка";
  }
}

messages = safeLoad();
renderHistory();
if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}), { once: true });
}

loadBtn.addEventListener("click", async () => {
  if (busy || modelReady) return;
  setNotice("");
  loadBtn.disabled = true;
  loadBtn.textContent = "Загрузка…";
  progressWrap.style.display = "block";
  progressBar.style.width = "0%";
  setStatus("Загружаем Qwen", "loading");
  setupTitle.textContent = "Первая загрузка модели";
  setupDesc.textContent = "Скачиваются веса Qwen. Рекомендуется Wi-Fi и свободное место не менее 1,5 ГБ.";
  try {
    const result = await loadLocalModel(setProgress);
    modelReady = true;
    setStatus(result.device === "webgpu" ? "Qwen · WebGPU" : "Qwen · CPU/WASM", "ready");
    loadBtn.textContent = "Модель загружена";
    progressBar.style.width = "100%";
    progressPercent.textContent = "Готово";
    progressText.textContent = "Модель остаётся на устройстве в кэше браузера";
    setupTitle.textContent = "Quantum-AI готов к работе";
    setupDesc.textContent = "Запросы обрабатываются локально. Интернет нужен для первого скачивания модели и отдельного поиска.";
    input.placeholder = "Напиши сообщение…";
    input.disabled = false;
    input.focus();
    setBusy(false);
    setNotice("Qwen загружена. Можно работать без API-ключа.", "good");
  } catch (error) {
    setStatus("Ошибка загрузки", "error");
    loadBtn.disabled = false;
    loadBtn.textContent = "Повторить загрузку";
    setupTitle.textContent = "Не удалось загрузить модель";
    setupDesc.textContent = error && error.message ? error.message : "Проверь соединение, свободное место и поддержку WebGPU.";
    setNotice("Модель не загружена. Перезагрузка страницы не удалит сохранённую историю.", "error");
  }
});

input.addEventListener("input", resizeInput);
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});
sendBtn.addEventListener("click", sendMessage);

$("clearBtn").addEventListener("click", () => {
  if (busy) return;
  if (!window.confirm("Очистить историю диалога на этом устройстве?")) return;
  messages = [];
  persist();
  renderHistory();
  setNotice("История очищена.");
});

$("exportBtn").addEventListener("click", () => {
  if (!messages.length) { setNotice("Пока нечего экспортировать."); return; }
  const file = new Blob([JSON.stringify({ app: "Quantum-AI", exportedAt: new Date().toISOString(), messages: messages }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "quantum-ai-chat.json";
  anchor.click();
  URL.revokeObjectURL(url);
  setNotice("История экспортирована.");
});

$("searchBtn").addEventListener("click", () => {
  searchMode = !searchMode;
  $("searchBtn").classList.toggle("active", searchMode);
  setNotice(searchMode ? "Поиск включён: будут использованы открытые статьи Wikipedia." : "Поиск выключен.");
});

$("attachBtn").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", async () => {
  const file = fileInput.files && fileInput.files[0];
  if (!file) return;
  clearAttachment();
  if (file.type.startsWith("image/")) {
    selectedFile = file;
    selectedImageUrl = URL.createObjectURL(file);
    attachmentPreview.src = selectedImageUrl;
    attachmentPreview.hidden = false;
    attachmentName.textContent = file.name;
    attachment.classList.add("visible");
  } else if (/\.(txt|md|json|csv)$/i.test(file.name) || file.type.startsWith("text/")) {
    if (file.size > 350000) {
      setNotice("Текстовый файл больше 350 КБ. Выбери файл поменьше.", "error");
      fileInput.value = "";
      return;
    }
    selectedFile = file;
    selectedFileText = (await file.text()).slice(0, 12000);
    attachmentPreview.hidden = true;
    attachmentName.textContent = file.name + " · текст";
    attachment.classList.add("visible");
  } else {
    setNotice("Поддерживаются изображения и текстовые файлы TXT, MD, JSON, CSV.", "error");
  }
  fileInput.value = "";
});
$("removeAttachment").addEventListener("click", clearAttachment);
function clearAttachment() {
  selectedFile = null;
  selectedFileText = "";
  if (selectedImageUrl) URL.revokeObjectURL(selectedImageUrl);
  selectedImageUrl = null;
  attachmentPreview.removeAttribute("src");
  attachmentPreview.hidden = true;
  attachment.classList.remove("visible");
  attachmentName.textContent = "";
}

$("micBtn").addEventListener("click", () => {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    setNotice("Голосовой ввод недоступен в этом браузере. Открой Quantum-AI в актуальном Chrome.", "error");
    return;
  }
  if (activeRecognition) {
    activeRecognition.stop();
    activeRecognition = null;
    $("micBtn").classList.remove("active");
    return;
  }
  try {
    const recognition = new Recognition();
    activeRecognition = recognition;
    recognition.lang = "ru-RU";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      let text = "";
      for (let i = event.resultIndex; i < event.results.length; i++) text += event.results[i][0].transcript;
      input.value = text;
      resizeInput();
    };
    recognition.onerror = () => setNotice("Браузер не смог распознать речь. Проверь разрешение на микрофон.", "error");
    recognition.onend = () => {
      activeRecognition = null;
      $("micBtn").classList.remove("active");
      input.focus();
    };
    $("micBtn").classList.add("active");
    setNotice("Слушаю. Распознавание выполняет браузер и может требовать интернет.");
    recognition.start();
  } catch (error) {
    activeRecognition = null;
    $("micBtn").classList.remove("active");
    setNotice("Не удалось включить микрофон: " + (error.message || "ошибка"), "error");
  }
});

$("speakBtn").addEventListener("click", () => {
  if (!("speechSynthesis" in window)) {
    setNotice("Озвучивание недоступно в этом браузере.", "error");
    return;
  }
  const last = [...messages].reverse().find((item) => item.role === "assistant");
  if (!last) { setNotice("Пока нечего озвучивать."); return; }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(last.content);
  utterance.lang = "ru-RU";
  const voices = window.speechSynthesis.getVoices();
  const russian = voices.find((voice) => /^ru(-|$)/i.test(voice.lang));
  if (russian) utterance.voice = russian;
  window.speechSynthesis.speak(utterance);
});

function shouldSearch(text) {
  return searchMode || /\b(найди|поищи|поиск|в интернете|свеж(ие|ую|ая)|сегодняшн(ие|юю)|последн(ие|юю))\b/i.test(text);
}
function stripSearchPrefix(text) {
  return text.replace(/^(найди|поищи|поиск|найди в интернете|поищи в интернете)\s*/i, "").trim() || text;
}

async function sendMessage() {
  const text = input.value.trim();
  if (!text || busy) return;
  if (!modelReady) {
    setNotice("Сначала нажми «Загрузить модель».", "error");
    return;
  }

  const imageFile = selectedFile && selectedFile.type.startsWith("image/") ? selectedFile : null;
  let modelContent = text;
  if (selectedFileText) modelContent += "\n\nСодержимое файла:\n" + selectedFileText;
  const userMessage = { role: "user", content: text + (selectedFile ? "\n📎 " + selectedFile.name : ""), modelContent: modelContent, sources: [] };
  messages.push(userMessage);
  appendMessage("user", userMessage.content);
  persist();
  input.value = "";
  resizeInput();
  const attachedTextWasUsed = Boolean(selectedFileText);
  clearAttachment();
  setBusy(true);
  const assistantView = appendMessage("assistant", "Думаю…");
  let sources = [];

  try {
    if (shouldSearch(text)) {
      const query = stripSearchPrefix(text);
      setNotice("Ищу материалы в Wikipedia…");
      try {
        sources = await searchWikipedia(query);
      } catch (searchError) {
        setNotice("Поиск не сработал. Ответ будет сформирован без внешних материалов.", "error");
      }
      if (sources.length) {
        modelContent += "\n\nМатериалы из Wikipedia (используй их как источники, не считай безошибочными):\n";
        sources.forEach((source, index) => {
          modelContent += "\n" + (index + 1) + ". " + source.title + "\n" + source.excerpt + "\n" + source.url + "\n";
        });
        userMessage.modelContent = modelContent;
      }
    }
    setNotice(imageFile ? "Анализирую изображение локально…" : "Ответ генерируется на устройстве…");
    const answer = await generateAnswer(messages, {
      imageFile: imageFile,
      currentText: modelContent,
      maxNewTokens: 280,
      onToken: (piece, accumulated) => {
        assistantView.bubble.textContent = accumulated;
        scrollBottom();
      }
    });
    const finalAnswer = answer || "Модель не вернула текст. Попробуй задать вопрос иначе.";
    assistantView.bubble.textContent = finalAnswer;
    messages.push({ role: "assistant", content: finalAnswer, modelContent: finalAnswer, sources: sources });
    if (sources.length) {
      const sourceWrap = document.createElement("div");
      sourceWrap.className = "message-tools";
      sources.forEach((source, index) => {
        const link = document.createElement("a");
        link.className = "source-link";
        link.href = source.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = (index + 1) + ". " + source.title;
        sourceWrap.appendChild(link);
      });
      assistantView.row.appendChild(sourceWrap);
    }
    persist();
    setNotice(attachedTextWasUsed ? "Файл обработан локальной моделью." : (sources.length ? "Ответ подготовлен с материалами Wikipedia." : "Готово · запрос обработан локально."), "good");
  } catch (error) {
    const message = error && error.message ? error.message : "Неизвестная ошибка генерации.";
    assistantView.bubble.textContent = "Не удалось получить ответ: " + message;
    messages.push({ role: "assistant", content: assistantView.bubble.textContent, modelContent: assistantView.bubble.textContent, sources: [] });
    persist();
    setNotice("Проверь память устройства и попробуй ещё раз.", "error");
  } finally {
    setBusy(false);
    input.focus();
    scrollBottom();
  }
}

setStatus("Модель не загружена", "");
setBusy(false);