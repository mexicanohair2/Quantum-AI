const TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2";
export const MODEL_ID = "onnx-community/Qwen3.5-0.8B-ONNX";
let runtime = null;
let loadingPromise = null;

function report(callback, item) {
  if (typeof callback === "function") callback(item || {});
}

export async function loadLocalModel(onProgress) {
  if (runtime) return { device: runtime.device, modelId: MODEL_ID };
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async function () {
    report(onProgress, { phase: "runtime", message: "Загрузка движка Transformers.js…" });
    const lib = await import(TRANSFORMERS_URL);
    const env = lib.env;
    env.allowRemoteModels = true;
    env.allowLocalModels = false;
    env.useBrowserCache = true;
    if (env.backends && env.backends.onnx && env.backends.onnx.wasm) {
      env.backends.onnx.wasm.numThreads = Math.max(1, Math.min(2, Number(navigator.hardwareConcurrency) || 1));
    }

    let device = "wasm";
    if (navigator.gpu && typeof navigator.gpu.requestAdapter === "function") {
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) device = "webgpu";
      } catch (_) {
        device = "wasm";
      }
    }

    report(onProgress, { phase: "processor", message: "Загрузка токенизатора и процессора…" });
    const processor = await lib.AutoProcessor.from_pretrained(MODEL_ID, {
      progress_callback: function (item) { report(onProgress, item); }
    });

    const options = {
      device: device,
      dtype: {
        embed_tokens: "q4",
        vision_encoder: "q4",
        decoder_model_merged: "q4"
      },
      progress_callback: function (item) { report(onProgress, item); }
    };

    let model;
    try {
      report(onProgress, { phase: "model", message: "Загрузка весов Qwen…" });
      model = await lib.Qwen3_5ForConditionalGeneration.from_pretrained(MODEL_ID, options);
    } catch (firstError) {
      if (device !== "webgpu") throw firstError;
      report(onProgress, { phase: "fallback", message: "GPU-режим недоступен. Пробуем более медленный WASM…" });
      device = "wasm";
      options.device = "wasm";
      model = await lib.Qwen3_5ForConditionalGeneration.from_pretrained(MODEL_ID, options);
    }

    runtime = {
      processor: processor,
      model: model,
      streamerClass: lib.TextStreamer,
      RawImage: lib.RawImage,
      device: device
    };
    report(onProgress, { phase: "ready", message: device === "webgpu" ? "Qwen готова · WebGPU" : "Qwen готова · CPU/WASM" });
    return { device: device, modelId: MODEL_ID };
  })();

  try {
    return await loadingPromise;
  } catch (error) {
    loadingPromise = null;
    throw error;
  }
}

export async function generateAnswer(history, options) {
  if (!runtime) throw new Error("Сначала загрузи модель Qwen.");
  const opts = options || {};
  const messages = Array.isArray(history) ? history.slice(-10) : [];
  const conversation = [
    {
      role: "system",
      content: "Ты Quantum-AI — полезный, точный и спокойный русскоязычный помощник. Отвечай на языке пользователя. Не выдумывай факты и источники. Если не знаешь ответа, прямо скажи об этом. Разделяй проверенные сведения и предположения. Пиши ясно и по делу."
    }
  ];

  for (const message of messages) {
    if (!message || !["user", "assistant"].includes(message.role)) continue;
    const content = typeof message.modelContent === "string" ? message.modelContent : String(message.content || "");
    if (!content.trim()) continue;
    conversation.push({ role: message.role, content: content });
  }

  const last = conversation[conversation.length - 1];
  let image = null;
  const inputText = opts.currentText || (last && last.role === "user" ? last.content : "");
  if (opts.imageFile) {
    const imageUrl = URL.createObjectURL(opts.imageFile);
    try {
      image = await runtime.RawImage.read(imageUrl);
      image = image.resize(448, 448);
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
    last.content = [
      { type: "image" },
      { type: "text", text: inputText || "Опиши это изображение." }
    ];
  }

  const prompt = runtime.processor.apply_chat_template(conversation, { add_generation_prompt: true });
  const inputs = image ? await runtime.processor(prompt, image) : await runtime.processor(prompt);
  let streamed = "";
  const streamer = new runtime.streamerClass(runtime.processor.tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: function (piece) {
      streamed += piece;
      if (typeof opts.onToken === "function") opts.onToken(piece, streamed);
    }
  });

  const outputs = await runtime.model.generate({
    ...inputs,
    max_new_tokens: Number(opts.maxNewTokens) || 280,
    do_sample: true,
    temperature: 0.7,
    top_p: 0.85,
    top_k: 20,
    repetition_penalty: 1.08,
    streamer: streamer
  });

  if (streamed.trim()) return streamed.trim();
  const decoded = runtime.processor.batch_decode(
    outputs.slice(null, [inputs.input_ids.dims.at(-1), null]),
    { skip_special_tokens: true }
  );
  return String(decoded && decoded[0] ? decoded[0] : "").trim();
}

export async function searchWikipedia(query) {
  const value = String(query || "").trim();
  if (!value) return [];
  const lang = /[А-Яа-яЁё]/.test(value) ? "ru" : "en";
  const base = "https://" + lang + ".wikipedia.org/w/api.php";
  const searchUrl = base + "?action=query&list=search&srsearch=" + encodeURIComponent(value) + "&format=json&origin=*&srlimit=4";
  const response = await fetch(searchUrl, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Wikipedia не ответила: HTTP " + response.status);
  const data = await response.json();
  const hits = data && data.query && data.query.search ? data.query.search : [];
  return hits.slice(0, 4).map(function (hit) {
    const title = String(hit.title || "");
    return {
      title: title,
      excerpt: String(hit.snippet || "").replace(/<[^>]*>/g, "").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&"),
      url: "https://" + lang + ".wikipedia.org/wiki/" + encodeURIComponent(title.replace(/ /g, "_"))
    };
  });
}