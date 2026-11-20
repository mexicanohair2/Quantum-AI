# Quantum-AI

Quantum-AI — веб-чат с языковой моделью **DeepSeek V4.1 Flash**.

## Открыть чат

https://mexicanohair2.github.io/Quantum-AI/

## Как устроено

- `index.html` — мобильный веб-интерфейс чата.
- `worker/worker.js` — серверный шлюз Cloudflare Workers AI.
- `worker/wrangler.toml` — конфигурация AI binding.
- `docs/DEEPSEEK_TRANSFER.md` — исторические технические заметки о проектировании отдельной модели Quantum-AI.

## Подключённый движок

- Model ID: `@cf/deepseek-ai/deepseek-v4.1-flash-1017`
- Inference provider: Cloudflare Workers AI.
- Защита запросов: Cloudflare Turnstile.
- Ограничение: один запрос в минуту с одного IP, максимум 256 выходных токенов за ответ.
- История чата хранится локально в браузере; сервер не сохраняет переписку.

## Важно о модели и оплате

Сайт обращается к размещённой модели DeepSeek V4.1 Flash. Это реальный DeepSeek inference, но **не собственные обученные веса Quantum-AI**. Для этой модели Cloudflare указывает платный тариф Workers AI; стоимость зависит от количества входных и выходных токенов. Перед регулярным использованием владелец аккаунта должен проверить тариф и расходы.

В доступных материалах проекта также описывалась собственная архитектура Quantum-AI. Полный код и обученные веса этой самостоятельной модели не были доступны в исходном репозитории, поэтому они не выдаются за готовый продукт.

## Развёртывание

Статический интерфейс публикуется GitHub Actions → GitHub Pages. API развёрнут как Cloudflare Worker `quantum-ai-api`; секрет Turnstile хранится только в Cloudflare Worker Secrets и не находится в GitHub.
