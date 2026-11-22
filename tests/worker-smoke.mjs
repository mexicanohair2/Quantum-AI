import assert from "node:assert/strict";
import worker, { estimateReservation, normalizeMessages } from "../worker/index.mjs";

const origin = "https://mexicanohair2.github.io";
const originalFetch = globalThis.fetch;
const userId = "8b90b6c7-1e36-4fd5-8a6c-123456789012";
const reservationId = "f0d5c2e3-1c4b-4e80-a72d-123456789012";
let searchCalls = 0;
let reserveCalls = [];
let settleCalls = [];
let authMode = "valid";
let quotaAllowed = true;

function makeRequest(messages, options = {}) {
  return new Request("https://quantum-ai-chat-api.example.workers.dev/api/chat", {
    method: "POST",
    headers: {
      Origin: options.origin || origin,
      Authorization: options.authorization || "Bearer player-session-token",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ messages })
  });
}

const env = {
  SUPABASE_URL: "https://qqcross.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  SUPABASE_SERVICE_ROLE_KEY: "server-only-test-key",
  AI: {
    async run(model, options) {
      assert.equal(model, "@cf/zai-org/glm-4.7-flash");
      assert.equal(options.max_completion_tokens, 192);
      assert.equal(options.tool_choice, "auto");
      assert.equal(options.tools[0].name, "web_search");
      return {
        response: "Привет. Чем могу помочь?",
        usage: { prompt_tokens: 300, completion_tokens: 12 }
      };
    }
  }
};

try {
  globalThis.fetch = async (url, options = {}) => {
    const target = String(url);
    if (target.endsWith("/auth/v1/user")) {
      assert.equal(options.headers.apikey, "sb_publishable_test");
      assert.equal(options.headers.Authorization, "Bearer player-session-token");
      if (authMode === "invalid") return new Response("Unauthorized", { status: 401 });
      if (authMode === "anonymous") {
        return Response.json({ id: userId, is_anonymous: true });
      }
      if (authMode === "unconfirmed") {
        return Response.json({ id: userId, email: "player@example.com" });
      }
      return Response.json({
        id: userId,
        email: "player@example.com",
        email_confirmed_at: "2026-11-22T00:00:00Z",
        is_anonymous: false
      });
    }
    if (target.endsWith("/rpc/reserve_qqcross_ai_neurons")) {
      assert.equal(options.headers.apikey, "server-only-test-key");
      const body = JSON.parse(options.body);
      reserveCalls.push(body);
      return Response.json([{
        reservation_id: reservationId,
        allowed: quotaAllowed,
        neurons_used: quotaAllowed ? 100 : 10000,
        neurons_reserved: quotaAllowed ? body.p_neurons : 0,
        neurons_remaining: quotaAllowed ? 10000 - 100 - body.p_neurons : 0,
        daily_limit: 10000,
        resets_at: "2026-11-23T00:00:00Z"
      }]);
    }
    if (target.endsWith("/rpc/settle_qqcross_ai_neurons")) {
      const body = JSON.parse(options.body);
      settleCalls.push(body);
      return Response.json([{
        settled: true,
        charged_neurons: body.p_actual_neurons,
        neurons_used: 100 + body.p_actual_neurons,
        neurons_reserved: 0,
        neurons_remaining: 9900 - body.p_actual_neurons,
        daily_limit: 10000,
        resets_at: "2026-11-23T00:00:00Z"
      }]);
    }
    if (target.endsWith("/rpc/get_qqcross_ai_neuron_balance")) {
      return Response.json([{
        neurons_used: 250,
        neurons_reserved: 0,
        neurons_remaining: 9750,
        daily_limit: 10000,
        resets_at: "2026-11-23T00:00:00Z"
      }]);
    }
    if (target === "https://api.tavily.com/search") {
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
    }
    throw new Error("Unexpected fetch: " + target);
  };

  const messages = [{ role: "user", content: "Привет" }];
  assert.ok(estimateReservation(normalizeMessages(messages)) > 0);
  assert.ok(estimateReservation(normalizeMessages(messages)) < 10000);

  const directResponse = await worker.fetch(makeRequest(messages), env);
  assert.equal(directResponse.status, 200);
  const directData = await directResponse.json();
  assert.equal(directData.reply, "Привет. Чем могу помочь?");
  assert.equal(directData.quota.limit, 10000);
  assert.equal(directData.quota.remaining, 9900 - settleCalls[0].p_actual_neurons);
  assert.equal(reserveCalls[0].p_user_id, userId);
  assert.equal(settleCalls[0].p_user_id, userId);
  assert.ok(settleCalls[0].p_actual_neurons > 0);

  let modelCalls = 0;
  env.AI = {
    async run(model, options) {
      modelCalls += 1;
      if (modelCalls === 1) {
        assert.equal(options.tools.length, 1);
        return {
          response: "",
          tool_calls: [{
            id: "call_search_1",
            name: "web_search",
            arguments: { query: "Последние новости о космосе", topic: "news" }
          }],
          usage: { prompt_tokens: 400, completion_tokens: 18 }
        };
      }
      assert.equal(options.tools, undefined);
      assert.ok(options.messages.some((message) => message.role === "assistant" && message.tool_calls));
      assert.ok(options.messages.some((message) => message.role === "tool" && message.tool_call_id === "call_search_1"));
      return {
        response: "Вот краткая сводка по найденной публикации.",
        usage: { prompt_tokens: 600, completion_tokens: 30 }
      };
    }
  };

  const toolResponse = await worker.fetch(
    makeRequest([{ role: "user", content: "Что нового в космосе?" }]),
    env
  );
  assert.equal(toolResponse.status, 200);
  const toolData = await toolResponse.json();
  assert.equal(toolData.reply, "Вот краткая сводка по найденной публикации.");
  assert.equal(toolData.sources.length, 1);
  assert.equal(toolData.sources[0].url, "https://example.org/space");
  assert.equal(modelCalls, 2);
  assert.equal(searchCalls, 1);

  const balanceResponse = await worker.fetch(
    new Request("https://quantum-ai-chat-api.example.workers.dev/api/balance", {
      headers: { Origin: origin, Authorization: "Bearer player-session-token" }
    }),
    env
  );
  assert.equal(balanceResponse.status, 200);
  assert.equal((await balanceResponse.json()).quota.remaining, 9750);

  const blockedResponse = await worker.fetch(makeRequest(messages, { origin: "https://example.com" }), env);
  assert.equal(blockedResponse.status, 403);

  authMode = "invalid";
  const invalidSession = await worker.fetch(makeRequest(messages), env);
  assert.equal(invalidSession.status, 401);

  authMode = "anonymous";
  const anonymousSession = await worker.fetch(makeRequest(messages), env);
  assert.equal(anonymousSession.status, 403);

  authMode = "unconfirmed";
  const unconfirmedSession = await worker.fetch(makeRequest(messages), env);
  assert.equal(unconfirmedSession.status, 403);

  authMode = "valid";
  quotaAllowed = false;
  const beforeDenied = settleCalls.length;
  const exhausted = await worker.fetch(makeRequest(messages), env);
  assert.equal(exhausted.status, 429);
  assert.equal(settleCalls.length, beforeDenied);

  const noAuth = await worker.fetch(makeRequest(messages, { authorization: "" }), env);
  assert.equal(noAuth.status, 401);

  const healthResponse = await worker.fetch(
    new Request("https://quantum-ai-chat-api.example.workers.dev/health", { headers: { Origin: origin } }),
    env
  );
  assert.equal(healthResponse.status, 200);
  assert.equal((await healthResponse.json()).ok, true);

  console.log("Quantum-AI per-player quota and backend smoke tests passed.");
} finally {
  globalThis.fetch = originalFetch;
}
