# Quantum-AI

Quantum-AI is designed as a single online AI assistant conversation, not as a chat plus a separate search engine.

## Live app

https://mexicanohair2.github.io/Quantum-AI/

## Product behavior

- The user talks to Quantum-AI in one conversation.
- The assistant decides whether it can answer from stable knowledge or needs current external information.
- When needed, the model calls the internal `web_search` tool, reviews the returned pages, and writes one synthesized answer with source links.
- The user does not need to switch to a separate search screen or formulate a second search query.
- Search is an assistant capability, not an independent product feature.
- Search covers pages available to the provider's index; it cannot guarantee coverage of the entire internet.
- Conversation history is kept locally in the current browser.

## Current implementation status

- Mobile-first workspace, sidebar, local chat history, rename/delete/export: implemented.
- Separate search page and search navigation: removed.
- Internal `web_search` tool contract and executor: implemented.
- Remote model inference and automatic tool-calling loop: **not connected**.
- The chat composer remains disabled until a real remote inference backend is integrated. The current website must not pretend to answer as an AI while no model is connected.

## Service constraints

A genuinely free, reliable, no-key, no-account, unlimited hosted model endpoint cannot be assumed. A working remote model requires a provider or infrastructure with explicit capacity, usage limits, and a secure server-side integration. No API secret may be embedded in this public frontend.

## Privacy

- Chat history is stored in this browser and is not synchronized between devices.
- When the assistant's web-search tool is connected to the model, search queries are sent to the external search provider and source links are shown in the answer.
- The UI identifies the product as Quantum-AI. Required third-party license notices must remain in technical/legal documentation.

## Release status

- Unified chat-first UI: implemented in source.
- Internal web-search tool contract: implemented and statically testable.
- Remote inference with model-controlled tool calls: pending.
- Real-device end-to-end testing: pending.
