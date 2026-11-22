import assert from "node:assert/strict";
import { ASSISTANT_TOOLS, executeAssistantTool } from "../src/assistant-tools.js";

assert.equal(ASSISTANT_TOOLS.length, 1);
assert.equal(ASSISTANT_TOOLS[0].function.name, "web_search");
assert.ok(ASSISTANT_TOOLS[0].function.description.includes("Do not call for ordinary stable knowledge"));

const originalFetch = globalThis.fetch;
let received;
globalThis.fetch = async (url, options) => {
  assert.equal(String(url), "https://api.tavily.com/search");
  received = JSON.parse(options.body);
  return new Response(JSON.stringify({
    results: [{
      title: "Источник",
      url: "https://example.org/page",
      content: "Фрагмент страницы",
      published_date: "2026-11-22"
    }]
  }), { status: 200, headers: { "content-type": "application/json" } });
};

try {
  const result = await executeAssistantTool("web_search", { query: "свежая информация", topic: "news" });
  assert.equal(received.query, "свежая информация");
  assert.equal(received.topic, "news");
  assert.equal(result.results[0].title, "Источник");
  assert.equal(result.results[0].snippet, "Фрагмент страницы");
  await assert.rejects(() => executeAssistantTool("unknown_tool", {}), /Неизвестный инструмент/);
  console.log("Quantum-AI assistant tool tests passed.");
} finally {
  globalThis.fetch = originalFetch;
}
