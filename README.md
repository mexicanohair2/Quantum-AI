# Quantum-AI

Quantum-AI is the assistant planned for integration into QQCross, replacing the current encyclopedia experience. It uses the player's existing, email-confirmed QQCross account.

## QQCross integration

The target experience is inside QQCross, replacing the encyclopedia tab:

https://mexicanohair2.github.io/QQCross/

The separate Quantum-AI Pages site remains a development preview, not a second account or a separate product:

https://mexicanohair2.github.io/Quantum-AI/

## Product behavior

- The QQCross encyclopedia tab becomes one chat screen with conversation and message composer.
- The existing confirmed QQCross email session is reused; there is no second registration.
- Chat history is isolated by Supabase Auth user ID and stored locally on that browser.
- The composer supports text and compressed JPG/PNG/WebP images.
- The assistant answers directly when it can and uses model-controlled web search only when current or externally verifiable information is needed.
- Search is an internal assistant tool, not a separate user-facing mode.

## Implementation status

- Simplified mobile-first chat interface and browser history: implemented.
- Message field and send button: enabled.
- Server-side Worker implementation: prepared in `worker/index.mjs`.
- Model tool-calling loop: implemented in source; the model can call `web_search`, receive results, and compose the final answer.
- Per-player 10,000-neuron daily allowance: implemented in QQCross Supabase with atomic reservations and settlement.
- Automated backend smoke tests: added.
- QQCross chat UI and Worker client integration are prepared on feature branches.
- **Live inference is not yet deployed.** The Worker endpoint is configured in the QQCross UI but will remain unavailable until the separate Worker is deployed after billing checks.

## Backend and cost safety

Text-only turns use Cloudflare-hosted GLM-4.7-Flash. Image turns route to Qwen 3.8 27B, whose Cloudflare model page documents vision and function calling. Model-specific neuron rates are used for reservation and settlement. The Worker uses the built-in AI binding; no provider API key is placed in the browser.

QQCross stores an independent 10,000-neuron daily allowance for each confirmed player, keyed by the stable Supabase Auth UUID. Cloudflare still applies its own separate 10,000-neuron daily free allocation to the entire Cloudflare account. Personal player quotas do not create separate Cloudflare free quotas.

The connected Cloudflare OAuth session cannot read Billing Profile or subscriptions: Cloudflare returned 403 because this OAuth connection has no Billing Read scope. A separate legacy Worker named `qq-ai-cloud-api` already exists and has an AI binding; it belongs to the separate QQ-AI project and must not be modified or reused. Therefore, the new Worker has not been deployed and inference has not been activated. Do not treat the daily application guard as a guarantee against charges from other account workloads.

## Privacy

- Chat history is stored locally per QQCross account on this browser and is not synchronized between devices.
- Text and any image the player attaches are sent to the Quantum-AI Worker for inference.
- When the assistant calls web search, only the search query and not the full chat history is sent to the search provider.
- The public frontend contains no model-provider secret.

## Release status

- Clean chat-first UI: implemented in source.
- Browser history persistence: implemented.
- Worker backend source and automated tests: implemented in repository.
- Supabase quota Edge Function: deployed with JWT verification. Cloudflare Worker deployment and QQCross UI connection: pending Billing Read verification.
- QQCross encyclopedia replacement UI: implemented on branch `feature/quantum-ai-chat`; PR and browser checks pending.
- Quantum-AI text/image routing: implemented on branch `feature/qqcross-chat-vision`; CI checks pending.
- Cloudflare Worker deployment and end-to-end live inference: blocked pending Billing Read verification and explicit cost approval.
- Real Android-device testing: pending.
