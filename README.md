# Quantum-AI

Quantum-AI is a mobile-first AI assistant project with its own product identity and interface.

## Live app

https://mexicanohair2.github.io/Quantum-AI/

## Current state

- The visible interface no longer asks users to download or install a model.
- The phone is intended to act as an online client; inference will run remotely.
- The online inference backend is **not connected yet**. The chat input is intentionally disabled rather than pretending that a local or remote model is ready.
- The old in-browser inference engine remains in the repository as legacy prototype code, but the current interface does not import or start it.
- The public landing screen identifies the product only as Quantum-AI.

## Product requirements

- Free access is the target; no paid hosting, subscriptions, usage charges, or payment cards.
- No API key that the user has to obtain, paste, or manage.
- Never place privileged secrets in browser JavaScript or a public repository.
- Do not claim unlimited free usage if a provider imposes daily quotas, queues, sleep, or rate limits.
- Third-party model and software licenses must be respected in the required technical/legal notices.
- Keep the user-facing interface simple, polished, and phone-first.
- Keep Quantum-AI separate from QQCross.

## Online architecture under development

1. GitHub Pages serves the Quantum-AI interface.
2. A free remote inference host runs the selected model.
3. The browser sends requests to that host over HTTPS.
4. The service returns answers, preferably as a stream.
5. History and user-controlled memory remain separate from the inference provider.
6. Search, documents, image input and voice are added only after their cost, privacy and free-tier limits are verified.

## Free hosting research

Hugging Face Spaces ZeroGPU is a candidate, not yet an integrated service. Its free tier has daily GPU-time limits and queue/availability constraints. It must not be presented as unlimited or guaranteed.

Official references:
- https://huggingface.co/docs/hub/spaces-zerogpu
- https://huggingface.co/docs/hub/spaces-overview
- https://huggingface.co/pricing

## Release gate

Quantum-AI is not online-ready until a real request from the deployed site reaches the remote inference backend and returns an answer without a paid key, payment card, or hidden charge. Free quotas and availability limitations must be disclosed before use.
