const SITE_ORIGIN = "https://mexicanohair2.github.io";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": SITE_ORIGIN,
      "access-control-allow-methods": "POST, OPTIONS, GET",
      "access-control-allow-headers": "content-type",
      "vary": "Origin"
    }
  });
}

export default {
  async fetch(request) {
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
      return json({ ok: false, service: "Quantum-AI", core: "not-integrated" }, 503);
    }
    if (request.method !== "POST" || url.pathname !== "/v1/chat") {
      return json({ error: "Not found" }, 404);
    }

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

    return json({
      ok: false,
      error: "Ядро Quantum-AI ещё не подключено. Ответ не был сгенерирован сторонней моделью."
    }, 503);
  }
};
