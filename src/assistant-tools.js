import { searchWeb } from "./web-search.js";

/**
 * Tool contract for the remote assistant runtime.
 * The model, not the user, decides whether current external information is needed.
 */
export const ASSISTANT_TOOLS = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the public web when the user asks for current, recent, changing, or externally verifiable information, or when reliable sources are needed. Do not call for ordinary stable knowledge or simple conversation. After searching, inspect and synthesize the results into a direct answer; do not merely dump a list of links.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "A concise search query that preserves the user's intent." },
          topic: { type: "string", enum: ["general", "news"], description: "Use news for recent events and current reporting; otherwise general." }
        },
        required: ["query"],
        additionalProperties: false
      }
    }
  }
];

export async function executeAssistantTool(name, args = {}) {
  if (name !== "web_search") {
    throw new Error("Неизвестный инструмент ассистента: " + String(name));
  }
  const result = await searchWeb(args.query, {
    topic: args.topic === "news" ? "news" : "general",
    maxResults: 7
  });
  return {
    query: result.query,
    results: result.results.map((item) => ({
      title: item.title,
      url: item.url,
      snippet: item.content,
      publishedDate: item.publishedDate || null
    }))
  };
}
