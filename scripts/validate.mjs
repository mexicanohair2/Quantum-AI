import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const html = readFileSync("index.html", "utf8");
const app = readFileSync("src/app.js", "utf8");
const engine = readFileSync("src/quantum-engine.js", "utf8");
const sw = readFileSync("sw.js", "utf8");
const readme = readFileSync("README.md", "utf8");
const architecture = readFileSync("docs/QUANTUM_AI_ARCHITECTURE.md", "utf8");

assert.match(html, /src\/app\.js/);
assert.match(html, /loadModelBtn/);
assert.match(html, /fileInput/);
assert.match(app, /loadLocalModel/);
assert.match(app, /generateAnswer/);
assert.match(app, /searchWikipedia/);
assert.match(app, /localStorage/);
assert.match(engine, /onnx-community\/Qwen3\.5-0\.8B-ONNX/);
assert.match(engine, /Qwen3_5ForConditionalGeneration/);
assert.match(engine, /device: device/);
assert.match(engine, /device = "wasm"/);
assert.match(sw, /addAll\(APP_FILES\)/);
assert.match(readme, /API[- ]ключ|API key/i);
assert.match(architecture, /Qwen3\.5-0\.8B-ONNX/);
assert.doesNotMatch(html + app + engine, /AIza[0-9A-Za-z_-]{20,}|sk-[A-Za-z0-9]{20,}/);

console.log("Quantum-AI static validation passed.");
