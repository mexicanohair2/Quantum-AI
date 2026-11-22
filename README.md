# Quantum-AI

Quantum-AI is a free, mobile-first local AI assistant built around the open Qwen model. The current implementation runs inference in the browser; it does not call a paid inference API and does not require an API key.

## Live app

https://mexicanohair2.github.io/Quantum-AI/

## Current implementation

- **Local model:** onnx-community/Qwen3.5-0.8B-ONNX, using the Qwen3.5 0.8B ONNX weights.
- **Runtime:** Hugging Face Transformers.js 4.3.2 and ONNX Runtime.
- **Acceleration:** WebGPU when a compatible adapter is available; otherwise a slower WASM/CPU fallback is attempted.
- **Chat:** multi-turn context, streamed output and local conversation history.
- **Vision:** image attachments are passed to the Qwen3.5 vision-language processor.
- **Files:** TXT, MD, JSON and CSV text attachments.
- **Voice:** browser speech recognition for dictation (browser/device dependent) and device speech synthesis for reading the last answer.
- **Search:** optional no-key search over Wikipedia with source links.
- **PWA shell:** the app shell is cached by a service worker. Model and runtime files are cached by the browser/runtime where supported.

## First launch

1. Open the live app in a current Android Chrome browser.
2. Press **Загрузить модель**.
3. Allow the initial model download to finish. The selected q4 artifacts are roughly 0.7 GB in total; keep at least 1.5 GB of free space and preferably use Wi-Fi.
4. After the model is loaded, send a message. Generation is local on the device.

The model is not included in the GitHub repository. It is downloaded directly from Hugging Face the first time. No login or API token is needed for the public model files.

## Offline and privacy behavior

- The first model and runtime download requires internet access.
- After a successful download, local generation can work offline while the browser retains the cached model/runtime files.
- Browser storage is subject to eviction by the operating system/browser. If the cache is removed, the model must be downloaded again.
- Wikipedia search and browser speech recognition may use the internet. The normal local chat does not send the prompt to an inference server.
- Conversation history is stored in this browser's local storage. It is not synchronized between devices.

## Important limitations

- Qwen3.5-0.8B is a compact model intended for lightweight use and prototyping. It is not equivalent in capability to a large cloud Qwen model.
- Device-specific speed, thermal behavior, storage persistence, WebGPU support and vision inference must be checked on the actual phone. The code has not yet been validated on every Android browser.
- PDF, DOCX, video understanding, account sync, vector memory and external website crawling are not implemented yet.
- Wikipedia search is a limited free search source, not a complete web search engine.
- Browser speech recognition is controlled by the browser and may rely on a network service. It is not guaranteed to work offline.
- The app does not claim to be an independently trained model. It openly identifies Qwen as its language model.

## Model and runtime

- Model: https://huggingface.co/onnx-community/Qwen3.5-0.8B-ONNX
- Model license: Apache-2.0, as shown on the model card.
- Runtime: https://github.com/huggingface/transformers.js
- Runtime package: https://www.npmjs.com/package/@huggingface/transformers

Keep the model attribution and license notices intact when redistributing model weights. The ONNX export is a community conversion of Qwen weights, not a new model trained by this repository.

## Development and checks

The application is a static site: no server, API key, backend, Node.js setup or local build is required for the user.

The repository includes a lightweight static validation script. GitHub Actions runs the script and JavaScript syntax checks on pushes to main.

## Project direction

The immediate goal is a reliable free local assistant with a simple phone-first interface. Future modules (better document parsing, more capable local model options, stronger memory, expanded free search and optional integrations) are added only after their costs, licenses, device requirements and actual behavior are checked.