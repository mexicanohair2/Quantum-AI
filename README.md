# Quantum-AI

Quantum-AI is designed as one online AI chat. The user sends a normal message; the assistant should decide when it needs external tools such as web search.

## Live app

https://mexicanohair2.github.io/Quantum-AI/

## Product behavior

- One chat screen: conversation and message composer.
- Chat history is available in the side panel.
- No separate search page, service-status banner, export/clear buttons, or decorative information cards.
- The assistant should answer directly when it can and call `web_search` only when current or externally verifiable information is needed.
- Search is an internal assistant tool, not a separate user-facing mode.

## Current implementation status

- Simplified mobile-first chat interface: implemented.
- Chat history in browser storage: implemented.
- Message field and send button: enabled.
- Honest unavailable-service error when no inference endpoint is configured: implemented.
- Internal `web_search` tool schema and executor: prepared.
- Real remote model inference and automatic tool-calling: **not connected yet**. The UI does not fabricate AI answers.

## Backend requirements

The public GitHub Pages frontend cannot securely host model credentials or inference. A remote backend must be configured with an AI binding/provider and a server-side tool-calling loop. Do not put API secrets in public JavaScript.

Cloudflare Workers AI offers a published free daily allocation of 10,000 Neurons; usage above that fails on Workers Free, while Workers Paid can bill beyond the allocation. The connected account's billing plan could not be verified with the current read permissions, so do not activate inference or imply it is guaranteed cost-free until that is confirmed.

## Privacy

- Chat history is stored in this browser and is not synchronized between devices.
- When inference is connected, message content will be sent to the configured model provider.
- When the assistant calls web search, the query is sent to the search provider.
- Required third-party license notices remain in technical/legal documentation.

## Release status

- Clean chat-first UI: implemented in source.
- Browser history persistence: implemented.
- Backend integration: pending billing-safe provider confirmation and deployment.
- End-to-end AI answers and model-controlled search: pending.
- Real Android-device testing: pending.
