import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const html = readFileSync("index.html", "utf8");
const css = readFileSync("styles.css", "utf8");
const app = readFileSync("src/app.js", "utf8");
const search = readFileSync("src/web-search.js", "utf8");
const sw = readFileSync("sw.js", "utf8");
const manifest = readFileSync("manifest.webmanifest", "utf8");
const readme = readFileSync("README.md", "utf8");
const architecture = readFileSync("docs/QUANTUM_AI_ARCHITECTURE.md", "utf8");

assert.ok(html.includes("Quantum-AI"));
assert.ok(html.includes("styles.css"));
assert.ok(html.includes("src/app.js"));
assert.ok(html.includes("chatHistory"));
assert.ok(html.includes("sidebar"));
assert.ok(html.includes("searchForm"));
assert.ok(html.includes("searchResults"));
assert.ok(!/Qwen|Загрузить модель|скачать модель|локальный ИИ/i.test(html));
assert.ok(app.includes("quantum-ai-workspace-v1"));
assert.ok(app.includes("LEGACY_KEY"));
assert.ok(app.includes("renameChat"));
assert.ok(app.includes("deleteChat"));
assert.ok(app.includes("runWebSearch"));
assert.ok(!/quantum-engine|loadLocalModel|generateAnswer|Qwen/i.test(app));
assert.ok(search.includes("https://api.tavily.com/search"));
assert.ok(search.includes("X-Tavily-Access-Mode"));
assert.ok(search.includes("keyless"));
assert.ok(sw.includes("quantum-ai-shell-v3"));
assert.ok(sw.includes("./styles.css?v=20261122-qq-workspace-1"));
assert.ok(sw.includes("./src/web-search.js"));
assert.ok(!sw.includes("quantum-engine.js"));
assert.ok(manifest.includes("Quantum-AI"));
assert.ok(readme.includes("Search"));
assert.ok(architecture.includes("Общий веб-поиск"));

console.log("Quantum-AI workspace, chat history and web-search checks passed.");
