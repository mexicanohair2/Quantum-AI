# Quantum-AI

Quantum-AI is designed as one online AI chat. The user sends a normal message; the assistant decides when it needs external tools such as web search.

## Live app

https://mexicanohair2.github.io/Quantum-AI/

## Product behavior

- One chat screen: conversation and message composer.
- Chat history is available in the side panel.
- No separate search page, service-status banner, export/clear buttons, or decorative information cards.
- The assistant answers directly when it can and uses model-controlled web search only when current or externally verifiable information is needed.
- Search is an internal assistant tool, not a separate user-facing mode.

## Implementation status

- Simplified mobile-first chat interface and browser history: implemented.
- Message field and send button: enabled.
- Server-side Worker implementation: prepared in `worker/index.mjs`.
- Model tool-calling loop: implemented in source; the model can call `web_search`, receive results, and compose the final answer.
- Global daily usage guard: implemented in the Worker using a SQLite-backed Durable Object, with a conservative Quantum-AI budget reservation.
- Automated backend smoke tests: added.
- **Live inference is not yet deployed or connected.** The frontend endpoint remains unset, so the interface does not fabricate answers.

## Backend and cost safety

The planned inference model is Cloudflare-hosted GLM-4.7-Flash. Cloudflare documents multilingual dialogue, function calling, and availability on Workers Free. The Worker uses the built-in AI binding; no provider API key is placed in the browser.

The Worker reserves estimated usage against a 5,000-Neuron daily Quantum-AI budget. This is an application-level guard, not an account-wide Cloudflare spending limit. The Cloudflare 10,000-Neuron allocation is shared across all Workers AI use in the account. Another Worker can consume part of that allocation.

The connected Cloudflare account's billing plan and current account-wide AI usage could not be verified with the available permissions. A separate legacy Worker named `qq-ai-cloud-api` already exists and has an AI binding; it belongs to the separate QQ-AI project and must not be modified or reused. Therefore, the new Worker has not been deployed and inference has not been activated. Do not treat the daily application guard as a guarantee against charges from other account workloads.

## Privacy

- Chat history is stored in this browser and is not synchronized between devices.
- When inference is connected, message content will be sent to Cloudflare Workers AI.
- When the assistant calls web search, only the search query and not the full chat history is sent to the search provider.
- The public frontend contains no model-provider secret.

## Release status

- Clean chat-first UI: implemented in source.
- Browser history persistence: implemented.
- Worker backend source and automated tests: implemented in repository.
- Cloudflare deployment and endpoint connection: pending billing/usage verification.
- End-to-end live inference and search: pending deployment.
- Real Android-device testing: pending.
