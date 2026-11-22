import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const html = readFileSync("index.html", "utf8");
const app = readFileSync("src/app.js", "utf8");
const search = readFileSync("src/web-search.js", "utf8");
const sw = readFileSync("sw.js", "utf8");
const manifest = readFileSync("manifest.webmanifest", "utf8");
const readme = readFileSync("README.md", "utf8");
const architecture = readFileSync("docs/QUANTUM_AI_ARCHITECTURE.md", "utf8");

assert.ok(html.includes("Quantum-AI"));
assert.ok(html.includes("chatHistory"));
assert.ok(html.includes("sidebar"));
assert.ok(html.includes("searchForm"));
assert.ok(html.includes("searchResults"));
assert.ok(html.includes("styles.css?v=20261122-disable-sw-3"));
assert.ok(html.includes("src/app.js?v=20261122-disable-sw-3"));
assert.ok(!/Qwen|quantum-engine|loadLocalModel|Загрузить модель|скачать модель/i.test(html + app));
assert.ok(app.includes("quantum-ai-workspace-v1"));
assert.ok(app.includes("LEGACY_KEY"));
assert.ok(app.includes("renameChat"));
assert.ok(app.includes("deleteChat"));
assert.ok(app.includes("runWebSearch"));
assert.ok(!app.includes("serviceWorker.register"));
assert.ok(search.includes("https://api.tavily.com/search"));
assert.ok(search.includes("X-Tavily-Access-Mode"));
assert.ok(search.includes("keyless"));
assert.ok(sw.includes("self.registration.unregister()"));
assert.ok(sw.includes("caches.delete"));
assert.ok(!sw.includes("addAll("));
assert.ok(!sw.includes("addEventListener(\"fetch\""));
assert.ok(manifest.includes("Quantum-AI"));
assert.ok(readme.includes("Search"));
assert.ok(architecture.includes("Общий веб-поиск"));

console.log("Quantum-AI no-model and cache-removal checks passed.");
