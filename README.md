# Quantum-AI

Quantum-AI is the assistant planned for integration into QQCross, replacing the current encyclopedia experience. It uses the player's existing, email-confirmed QQCross account.

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
- Per-player 10,000-neuron daily allowance: implemented in QQCross Supabase with atomic reservations and settlement.
- Automated backend smoke tests: added.
- **Live inference is not yet deployed or connected.** The frontend endpoint remains unset, so the interface does not fabricate answers.

## Backend and cost safety

The planned inference model is Cloudflare-hosted GLM-4.7-Flash. Cloudflare documents multilingual dialogue, function calling, and availability on Workers Free. The Worker uses the built-in AI binding; no provider API key is placed in the browser.

QQCross stores an independent 10,000-neuron daily allowance for each confirmed player, keyed by the stable Supabase Auth UUID. Cloudflare still applies its own separate 10,000-neuron daily free allocation to the entire Cloudflare account. Personal player quotas do not create separate Cloudflare free quotas.

The connected Cloudflare OAuth session cannot read Billing Profile or subscriptions: Cloudflare returned 403 because this OAuth connection has no Billing Read scope. A separate legacy Worker named `qq-ai-cloud-api` already exists and has an AI binding; it belongs to the separate QQ-AI project and must not be modified or reused. Therefore, the new Worker has not been deployed and inference has not been activated. Do not treat the daily application guard as a guarantee against charges from other account workloads.

## Privacy

- Chat history is stored in this browser and is not synchronized between devices.
- When inference is connected, message content will be sent to Cloudflare Workers AI.
- When the assistant calls web search, only the search query and not the full chat history is sent to the search provider.
- The public frontend contains no model-provider secret.

## Release status

- Clean chat-first UI: implemented in source.
- Browser history persistence: implemented.
- Worker backend source and automated tests: implemented in repository.
- Cloudflare deployment and endpoint connection: pending Billing Read access and secure Worker secret configuration.
- QQCross encyclopedia replacement UI and end-to-end live inference: not yet integrated.
- Real Android-device testing: pending.
