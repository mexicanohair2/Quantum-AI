# Quantum-AI — актуальная архитектура и статус

**Дата обновления:** 22 ноября 2026 года  
**Стратегия:** бесплатное приложение на базе открытой Qwen, без платных API, ключей, подписок и обязательного сервера.

## 1. Продуктовое решение

- Продукт называется **Quantum-AI**.
- Qwen — текущее языковое ядро. Приложение не выдаёт веса Qwen за собственную модель.
- QQ-AI остаётся отдельным архивом наработок. Слияние репозиториев не выполнять без отдельного аудита и необходимости.
- Обучение собственной foundation model с нуля не входит в ближайший план.
- Основной пользовательский сценарий — запуск на телефоне, минимум настройки, локальная генерация.
- Внешние запросы разрешены только для отдельных дополнительных функций (например, Wikipedia search) и должны быть явно обозначены.

## 2. Выбранный первый runtime

- ONNX model: onnx-community/Qwen3.5-0.8B-ONNX.
- Runtime: @huggingface/transformers 4.3.2.
- Model class: Qwen3_5ForConditionalGeneration with AutoProcessor.
- Quantization: q4 for embedding, decoder and vision encoder.
- Preferred execution: WebGPU when navigator.gpu.requestAdapter() succeeds.
- Fallback: ONNX Runtime WASM/CPU. This may be substantially slower and can fail on constrained devices.
- Model artifacts are downloaded from the public Hugging Face Hub at first launch. No API token is required for the public model.

The model card documents the ONNX Transformers.js integration, Qwen3.5 multimodal architecture and Apache-2.0 license. The 0.8B model is a small model for prototyping/lightweight tasks; do not describe it as equal to a large hosted Qwen model.

## 3. Device strategy

1. Detect a usable WebGPU adapter at runtime instead of trusting the device name.
2. Use q4 weights to reduce memory and download requirements.
3. If WebGPU loading fails, attempt WASM as a slower fallback.
4. Show a clear loading/progress state and a clear error when both routes fail.
5. Keep the first-run download warning visible (roughly 0.7 GB of selected q4 artifacts; exact transfer depends on runtime and model repository revisions).
6. Validate latency, RAM use, temperature, browser cache persistence and image inference on the physical target phone before marking support as verified.

The HONOR 400 product specification lists Snapdragon 7 Gen 3 and Adreno 720; Chrome documents Android WebGPU availability on Android 12+ devices with Qualcomm/ARM GPUs. This makes WebGPU a reasonable candidate, not a guarantee that every installed browser build will expose a working adapter.

## 4. Current app modules

- index.html: mobile-first interface and controls.
- src/app.js: chat state, local history, attachments, voice controls, Wikipedia search and UI lifecycle.
- src/quantum-engine.js: Qwen loading, WebGPU/WASM selection, multimodal preprocessing and local generation.
- sw.js: cache-first app shell for installability/offline page access.
- manifest.webmanifest: installable PWA metadata.
- scripts/validate.mjs: static regression checks.

## 5. Data flow and privacy

### Local chat
User message → local browser app → Qwen ONNX runtime → local answer → local browser history.

No inference API endpoint, API key, paid cloud model or remote chat backend exists in this implementation.

### Image
Image file → browser object URL → Qwen processor/vision encoder → local generation. Image is not uploaded to an inference server by the app.

### Text files
TXT/MD/JSON/CSV file → browser text read → bounded text context → local Qwen. Unsupported office/PDF/video formats are not claimed as supported.

### Wikipedia search
User explicitly toggles search or uses a search-intent phrase → Wikipedia public MediaWiki API → short snippets and source links → Qwen receives those snippets. This feature needs internet and is not a general crawler for the entire web.

### Voice
- Speech recognition uses the browser SpeechRecognition/Web Speech API where available. The browser may use an online recognition service; offline behavior is not guaranteed.
- Speech output uses browser/device speech synthesis, subject to installed voices.

### Storage
- Conversation history: browser localStorage, bounded to a fixed number of recent messages.
- App shell: service worker cache.
- Model weights/runtime: Transformers.js browser cache where supported.
- Browser/OS cache eviction can remove model files; re-download may then be required.
- No cross-device account or cloud sync is implemented.

## 6. Security and reliability requirements

- Never add privileged secrets or API keys to client files.
- Never claim model inference is online or local unless the selected route says so.
- Insert user/model/search content through text-safe DOM APIs, not untrusted HTML.
- Limit attachment sizes and message context.
- Use explicit external links with noopener noreferrer.
- Handle missing WebGPU, failed model downloads, storage exhaustion, offline state and browser speech API absence without blanking the chat.
- Keep project changes isolated from QQCross.

## 7. Implemented vs pending

### Implemented in repository
- Qwen3.5-0.8B ONNX loading path via Transformers.js.
- WebGPU detection with WASM fallback attempt.
- Local text generation and streaming.
- Image attachment and multimodal processor path.
- TXT/MD/JSON/CSV text attachment.
- Local chat history, export and clear.
- Browser voice dictation and speech synthesis.
- Keyless Wikipedia search.
- PWA app-shell caching and basic validation workflow.

### Not yet physically verified
- First model download and end-to-end inference on HONOR 400.
- Exact download bytes and retained browser cache after restart/offline.
- WebGPU stability, generation speed, memory use and thermal behavior on the target phone.
- Image inference on the target phone.
- SpeechRecognition support and whether the installed browser uses online speech service.
- GitHub Pages deployment and real-world mobile layout after this commit.

### Still to build
- Better memory beyond conversation history.
- PDF/DOCX parsing and richer document workflows.
- Broader web search with reliable citations.
- Robust conversation management, editable memory and user settings.
- More capable local model profiles if the device can safely run them.
- Automated browser-level integration tests on a supported mobile device.

## 8. Release gate

A function is not marked complete just because code exists. It must pass static/automated checks and, where hardware matters, a real device test. The first release gate is: load Qwen successfully, answer a multi-turn text conversation, process one image, restore history after reload, and complete an offline test after model/runtime caching.