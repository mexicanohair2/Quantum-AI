const SEARCH_ENDPOINT = "https://api.tavily.com/search";

export async function searchWeb(query, options = {}) {
  const cleanQuery = String(query || "").trim();
  if (!cleanQuery) throw new Error("Введите запрос для поиска.");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(SEARCH_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Tavily-Access-Mode": "keyless"
      },
      body: JSON.stringify({
        query: cleanQuery,
        topic: options.topic === "news" ? "news" : "general",
        search_depth: "basic",
        max_results: Math.min(8, Math.max(3, Number(options.maxResults) || 7)),
        include_answer: false,
        include_raw_content: false
      }),
      signal: controller.signal
    });

    if (response.status === 429) {
      throw new Error("Поиск временно ограничен общим бесплатным лимитом. Попробуй позже или открой результаты через внешний поиск.");
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error("Сервис веб-поиска временно не разрешил запрос. Можно открыть эту фразу в обычном поисковике.");
    }
    if (!response.ok) {
      throw new Error("Сервис веб-поиска вернул ошибку HTTP " + response.status + ".");
    }

    const data = await response.json();
    const results = Array.isArray(data.results) ? data.results : [];
    return {
      query: cleanQuery,
      results: results.map((item) => ({
        title: String(item.title || "Без названия"),
        url: String(item.url || ""),
        content: String(item.content || ""),
        publishedDate: item.published_date ? String(item.published_date) : ""
      })).filter((item) => /^https?:\/\//i.test(item.url))
    };
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw new Error("Поиск занял слишком много времени. Попробуй ещё раз.");
    }
    if (error instanceof TypeError) {
      throw new Error("Не удалось связаться с поисковым сервисом. Проверь соединение или открой результаты во внешнем поиске.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
