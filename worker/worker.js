const SITE_ORIGIN = "https://mexicanohair2.github.io";
const MODEL = "@cf/deepseek-ai/deepseek-v4.1-flash-1017";

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": SITE_ORIGIN,
      "access-control-allow-methods": "POST, OPTIONS, GET",
      "access-control-allow-headers": "content-type",
      "vary": "Origin",
      ...extra
    }
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (origin && origin !== SITE_ORIGIN) return json({ error: "Origin not allowed" }, 403);

    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": SITE_ORIGIN,
          "access-control-allow-methods": "POST, OPTIONS, GET",
          "access-control-allow-headers": "content-type",
          "access-control-max-age": "86400",
          "vary": "Origin"
        }
      });
    }

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "Quantum-AI DeepSeek gateway", model: MODEL });
    }
    if (request.method !== "POST" || url.pathname !== "/v1/chat") return json({ error: "Not found" }, 404);

    let body;
    try {
      const raw = await request.text();
      if (raw.length > 30000) return json({ error: "Сообщение слишком большое." }, 413);
      body = JSON.parse(raw);
    } catch {
      return json({ error: "Некорректный JSON." }, 400);
    }

    if (!Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > 20 ||
        body.messages.some(m => !m || !["system", "user", "assistant"].includes(m.role) ||
        typeof m.content !== "string" || m.content.length > 4000)) {
      return json({ error: "Некорректная история диалога." }, 400);
    }
    if (typeof body.turnstileToken !== "string" || body.turnstileToken.length < 10) {
      return json({ error: "Подтверди проверку безопасности." }, 403);
    }

    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const form = new FormData();
    form.append("secret", env.TURNSTILE_SECRET);
    form.append("response", body.turnstileToken);
    form.append("remoteip", ip);

    let verification;
    try {
      const result = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: form
      });
      verification = await result.json();
    } catch {
      return json({ error: "Не удалось проверить защиту. Попробуй ещё раз." }, 502);
    }

    if (!verification.success || verification.hostname !== "mexicanohair2.github.io") {
      return json({ error: "Проверка безопасности не пройдена. Обнови страницу и попробуй снова." }, 403);
    }

    const cacheKey = new Request("https://quantum-ai-rate-limit.invalid/" + encodeURIComponent(ip));
    const cache = caches.default;
    if (await cache.match(cacheKey)) {
      return json({ error: "Один запрос в минуту. Подожди немного." }, 429, { "retry-after": "60" });
    }
    await cache.put(cacheKey, new Response("1", {
      headers: { "cache-control": "public, max-age=60" }
    }));

    try {
      const result = await env.AI.run(MODEL, {
        messages: body.messages.slice(-12),
        max_tokens: 256,
        temperature: 0.65,
        reasoning_effort: "low",
        stream: false
      });
      const answer = typeof result?.response === "string"
        ? result.response
        : typeof result?.choices?.[0]?.message?.content === "string"
          ? result.choices[0].message.content
          : "";
      if (!answer.trim()) return json({ error: "Модель вернула пустой ответ." }, 502);
      return json({ ok: true, model: MODEL, answer });
    } catch {
      return json({
        error: "DeepSeek сейчас недоступен. Для этой модели нужен активный платный тариф Workers AI."
      }, 502);
    }
  }
};
