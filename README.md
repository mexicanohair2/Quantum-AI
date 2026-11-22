# Quantum-AI

Quantum-AI is a mobile-first AI assistant built around the open Qwen model.

## Product direction (current)

**Quantum-AI is moving to online-only inference.** The phone will be a client; Qwen will run on a remote compute service. The target remains free access, no paid API, no user-managed API key, and minimal setup.

The currently published preview still contains the earlier browser-local Qwen prototype. It is **not yet the final online architecture**. Do not mistake the current local model-loading button for a completed online service.

## Live app

https://mexicanohair2.github.io/Quantum-AI/

## Free online hosting research

The most promising candidate found so far is Hugging Face Spaces ZeroGPU:

- Hugging Face documents free ZeroGPU hosting for eligible personal accounts, with up to two Spaces for free accounts in good standing (verified email and account older than 30 days).
- Free visitors receive a daily GPU quota of 5 minutes when signed in; unauthenticated visitors receive 2 minutes. Queue priority and availability are not guaranteed.
- A free ZeroGPU Space can run a model on remote GPU hardware, so inference is online rather than on the phone.
- This is a limited free tier, **not unlimited always-available compute**.
- Standard Gradio/Docker CPU Spaces are not a reliable no-cost fallback for new free accounts under the current hosting rules.

Official references:
- https://huggingface.co/docs/hub/spaces-zerogpu
- https://huggingface.co/docs/hub/spaces-overview
- https://huggingface.co/pricing

No provider has yet been connected to the Quantum-AI frontend. The ZeroGPU path must be validated with the chosen Qwen model, browser-to-Space calls, visitor quota behavior, cold starts, and mobile use before it is treated as implemented.

## Non-negotiable constraints

- No paid hosting, subscriptions, API usage charges, or payment cards.
- No API key that the user has to obtain, paste, or manage.
- Do not put privileged secrets in browser JavaScript or GitHub Pages.
- Do not claim unlimited free usage when the provider has daily quotas, queues, sleep, or rate limits.
- Qwen remains the model family; identify its model and license honestly.
- Keep the user-facing setup simple and phone-friendly.
- Keep Quantum-AI separate from QQCross.

## Planned online architecture

1. GitHub Pages serves the static Quantum-AI interface.
2. A free remote inference host runs the Qwen model.
3. The browser sends chat requests to that host over HTTPS.
4. The remote host returns streamed answers where supported.
5. Conversation history and user-controlled memory are designed separately from the inference provider.
6. Optional search, files, vision and voice are added only when their online data flow, privacy, cost and free-tier limits are clear.

## Existing prototype (historical implementation)

The current deployed preview includes:
- Qwen3.5-0.8B ONNX running inside the browser via Transformers.js.
- WebGPU with a WASM/CPU fallback attempt.
- Local multi-turn chat history and export.
- Image and TXT/MD/JSON/CSV attachments.
- Browser speech input/output.
- Keyless Wikipedia search.
- PWA app-shell caching.

This local inference implementation is a prototype and is no longer the target product direction. Keep it clearly labelled as a prototype until the online backend replaces it.

## Current status and release gate

- Static frontend and GitHub Pages deployment: implemented.
- JavaScript syntax and static regression checks: passing in GitHub Actions at the last verified run.
- Online Qwen backend: not connected yet.
- ZeroGPU model compatibility and API integration: not yet tested.
- Free quota, queue and sleep behavior: must be tested and disclosed in the interface.
- Real-device mobile testing: pending.

Do not mark Quantum-AI as online-ready until a real request from the deployed GitHub Pages site reaches the remote Qwen backend and returns an answer without a paid key or hidden charge.

## Model attribution

Quantum-AI is the application/product name. Qwen is the current language model family. Do not present Qwen weights as independently trained Quantum-AI weights. Preserve the model's license and attribution notices.
