# Quantum-AI

Quantum-AI is a mobile-first assistant interface with a persistent local chat history and a built-in general web-search view.

## Live app

https://mexicanohair2.github.io/Quantum-AI/

## Current implementation

- Responsive workspace with a QQCross-inspired burgundy and muted-violet visual language.
- Desktop sidebar and mobile slide-out navigation.
- Multiple local conversations, chat filtering, rename, delete, and JSON export.
- Legacy single-chat history is migrated into the new chat list without deleting the old stored copy.
- General web search across indexed public web pages, with result titles, snippets, domains, and direct links.
- Search uses Tavily's anonymous keyless Search mode: no user API key or account setup is required, but access is shared and rate-limited.
- Search requests are sent to the external search provider; search history and chats are stored locally in the current browser.
- The UI identifies the product only as Quantum-AI and does not expose the underlying model name.

## Important service status

The remote AI conversation backend is **not connected yet**. The chat screen and local history are implemented, but message sending remains disabled until the online inference service is integrated and tested. Web search is an independent working feature and does not require the AI backend.

## Free-tier constraints

- Tavily's official JavaScript SDK documents Search and Extract without an API key, subject to shared rate limits. Other features such as Crawl, Map, and Research require a key.
- The keyless quota is controlled by the provider and can temporarily reject requests. Quantum-AI does not promise unlimited search availability.
- If integrated search is rate-limited or unavailable, the UI offers a link to open the query in an external search engine.
- No paid API, subscription, or payment card is required by this frontend.

## Privacy and storage

- Conversation history stays in the current browser's local storage. It is not synced across devices.
- Search queries are sent to the external search provider to retrieve web results. Recent local search terms may be kept in this browser.
- Search result links open the source website in a separate tab.
- No secrets or API keys are embedded in the public frontend.

## Release status

- Responsive Quantum-AI workspace: implemented in the repository.
- Chat history, local persistence, filtering, rename, delete, and export: implemented; still requires browser interaction testing.
- General web search: implemented with a public keyless endpoint; real browser/CORS and rate-limit testing on the target phone is pending.
- Remote AI inference: pending.
- Real-device end-to-end test: pending.
