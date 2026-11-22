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
- Automated backend and browser smoke tests: passing in GitHub Actions run #104, including recovery when web search returns an HTTP error.
- All text, image, and web-search synthesis turns use the same Qwen 3.8 27B model with a 2,048-token completion budget and medium reasoning effort; one model-specific reservation/settlement path covers every turn.
- QQCross chat UI and Worker client integration are prepared on feature branches.
- **Worker deployed; QQCross end-to-end release pending.** The dedicated Worker `quantum-ai-chat-api` is deployed at `https://quantum-ai-chat-api.qq-ai-cloud.workers.dev` with its own AI binding and Supabase configuration. A direct live Qwen inference test returned the correct result for `17 × 19` (323), consuming 94.6 Neurons. The legacy `qq-ai-cloud-api` was not changed. The QQCross UI release and authenticated browser round-trip remain to be verified.

## Backend and cost safety

All inference turns use Cloudflare-hosted Qwen 3.8 27B (`@cf/qwen/qwen3.8-27b`). Cloudflare documents text generation, image input, reasoning, and function calling for this model. The Worker uses Qwen's published rates for both reservation and settlement; GLM is not called. The Worker uses the built-in AI binding; no provider API key is placed in the browser.

QQCross stores an independent 10,000-neuron daily allowance for each confirmed player, keyed by the stable Supabase Auth UUID. Cloudflare still applies its own separate 10,000-neuron daily free allocation to the entire Cloudflare account. Personal player quotas do not create separate Cloudflare free quotas.

The connected Cloudflare OAuth session cannot read Billing Profile or subscriptions: Cloudflare returned 403 because this OAuth connection has no Billing Read scope. A separate legacy Worker named `qq-ai-cloud-api` already exists and has an AI binding; it belongs to the separate QQ-AI project and must not be modified or reused. The new Worker is deployed, but the account's Billing Read scope remains unavailable and its plan cannot be independently verified. Cloudflare publishes a 10,000-Neuron daily free allocation shared across the account; usage beyond it is billable on Workers Paid. The single direct model test used 94.6 Neurons. Do not treat the per-player application quota as a separate Cloudflare free allocation.

## Privacy

- Chat history is stored locally per QQCross account on this browser and is not synchronized between devices.
- Text and any image the player attaches are sent to the Quantum-AI Worker for inference.
- When the assistant calls web search, only the search query and not the full chat history is sent to the search provider.
- The public frontend contains no model-provider secret.

## Release status

- Clean chat-first UI: implemented in source.
- Browser history persistence: implemented.
- Worker backend source and automated tests: implemented in repository.
- Supabase quota Edge Function: deployed with JWT verification. Cloudflare Worker deployment: complete. QQCross UI connection: configured for the dedicated Worker; production Pages release and authenticated end-to-end verification remain pending.
- QQCross encyclopedia replacement UI: implemented on branch `feature/quantum-ai-chat`; PR #110 is draft and its mobile/desktop browser checks passed.
- Qwen-only Quantum-AI backend (text, image, web-search tool cycle): implemented on branch `feature/qwen-single-model`; PR #3 is draft and GitHub Actions run #104 passed syntax, static, backend, and browser smoke checks. It also verifies that a temporary web-search outage is returned to Qwen for an honest answer rather than aborting the entire request.
- Dedicated Cloudflare Worker deployment: complete. A real direct Qwen 3.8 27B inference returned `323` for `17 × 19`; usage metadata reported 94.6 Neurons. Billing Read remains unavailable through OAuth, so account plan and any other account-wide consumption cannot be verified. The authenticated QQCross browser round-trip remains pending.
- Real Android-device testing: pending.
