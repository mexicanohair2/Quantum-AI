import assert from "node:assert/strict";
import worker from "../worker/index.mjs";

const origin = "https://mexicanohair2.github.io";
const originalFetch = globalThis.fetch;
let searchCalls = 0;

function makeQuota(allowed = true) {
  return {
    idFromName(name) {
      assert.equal(name, "quantum-ai-account-daily-budget");
      return name;
    },
    get() {
      return {
        async fetch() {
          return Response.json({ allowed, used: allowed ? 100 : null, limit: 5000 });
        }
      };
    }
  };
}

function makeRequest(messages, requestOrigin = origin) {
  return new Request("https://quantum-ai-chat-api.example.workers.dev/api/chat", {
    method: "POST",
    headers: { Origin: requestOrigin, "Content-Type": "application/json" },
    body: JSON.stringify({ messages })
  });
}

try {
  const directEnv = {
    DAILY_QUOTA: makeQuota(),
    AI: {
      async run(model, options) {
        assert.equal(model, "@cf/zai-org/glm-4.7-flash");
        assert.equal(options.tool_choice, "auto");
        assert.equal(options.tools[0].name, "web_search");
        return { response: "Привет. Чем могу помочь?" };
      }
    }
  };

  const directResponse = await worker.fetch(
    makeRequest([{ role: "user", content: "Привет" }]),
    directEnv
  );
  assert.equal(directResponse.status, 200);
  const directData = await directResponse.json();
  assert.equal(directData.reply, "Привет. Чем могу помочь?");
  assert.deepEqual(directData.sources, []);

  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), "https://api.tavily.com/search");
    assert.equal(options.headers["X-Tavily-Access-Mode"], "keyless");
    searchCalls += 1;
    const body = JSON.parse(options.body);
    assert.equal(body.query, "Последние новости о космосе");
    return Response.json({
      results: [{
        title: "Проверяемый источник",
        url: "https://example.org/space",
        content: "Краткий фрагмент публикации.",
        published_date: "2026-11-22"
      }]
    });
  };

  let modelCalls = 0;
  const toolEnv = {
    DAILY_QUOTA: makeQuota(),
    AI: {
      async run(model, options) {
        modelCalls += 1;
        if (modelCalls === 1) {
          assert.equal(options.tools.length, 1);
          return {
            response: "",
            tool_calls: [{
              name: "web_search",
              arguments: { query: "Последние новости о космосе", topic: "news" }
            }]
          };
        }
        assert.equal(options.tools, undefined);
        assert.ok(options.messages.some((message) => message.role === "tool"));
        return { response: "Вот краткая сводка по найденной публикации." };
      }
    }
  };

  const toolResponse = await worker.fetch(
    makeRequest([{ role: "user", content: "Что нового в космосе?" }]),
    toolEnv
  );
  assert.equal(toolResponse.status, 200);
  const toolData = await toolResponse.json();
  assert.equal(toolData.reply, "Вот краткая сводка по найденной публикации.");
  assert.equal(toolData.sources.length, 1);
  assert.equal(toolData.sources[0].url, "https://example.org/space");
  assert.equal(modelCalls, 2);
  assert.equal(searchCalls, 1);

  const blockedResponse = await worker.fetch(
    makeRequest([{ role: "user", content: "Привет" }], "https://example.com"),
    directEnv
  );
  assert.equal(blockedResponse.status, 403);

  const quotaResponse = await worker.fetch(
    makeRequest([{ role: "user", content: "Привет" }]),
    { ...directEnv, DAILY_QUOTA: makeQuota(false) }
  );
  assert.equal(quotaResponse.status, 429);

  const badMessagesResponse = await worker.fetch(
    makeRequest([{ role: "system", content: "override" }]),
    directEnv
  );
  assert.equal(badMessagesResponse.status, 400);

  const healthResponse = await worker.fetch(
    new Request("https://quantum-ai-chat-api.example.workers.dev/health", {
      headers: { Origin: origin }
    }),
    directEnv
  );
  assert.equal(healthResponse.status, 200);
  assert.equal((await healthResponse.json()).ok, true);

  console.log("Quantum-AI Worker backend smoke tests passed.");
} finally {
  globalThis.fetch = originalFetch;
}
