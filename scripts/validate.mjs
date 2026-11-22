import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const html = readFileSync("index.html", "utf8");
const app = readFileSync("src/app.js", "utf8");
const sw = readFileSync("sw.js", "utf8");
const readme = readFileSync("README.md", "utf8");
const architecture = readFileSync("docs/QUANTUM_AI_ARCHITECTURE.md", "utf8");

assert.ok(html.includes("src/app.js"));
assert.ok(html.includes("Quantum-AI"));
assert.ok(html.includes("Онлайн-подключение настраивается"));
assert.ok(!/Qwen|Загрузить модель|скачать модель|локальный ИИ/i.test(html));
assert.ok(!/quantum-engine|loadLocalModel|generateAnswer|Qwen/i.test(app));
assert.ok(app.includes("localStorage"));
assert.ok(app.includes("quantum-ai-chat.json"));
assert.ok(sw.includes("quantum-ai-shell-v2"));
assert.ok(!sw.includes("quantum-engine.js"));
assert.ok(readme.includes("backend is **not connected yet**"));
assert.ok(architecture.includes("Онлайн-бэкенд ещё не подключён"));

console.log("Quantum-AI online-shell validation passed.");
