# Архитектура Quantum-AI

Этот документ фиксирует собственную архитектуру, которую планируется реализовать в проекте. Он не является подтверждением того, что все модули или веса уже существуют.

## Основные модули

| Область | Путь | Назначение |
|---|---|---|
| Токенизация | `quantum_core/tokenizer.py` | Byte-level BPE, специальные токены и merges |
| Языковая модель | `quantum_core/model.py` | Decoder-only Transformer, RMSNorm, GQA, SwiGLU, causal attention |
| Генерация | `quantum_core/generate.py` | Top-k, top-p, repetition penalty, потоковая выдача и UTF-8 decode |
| Обучение | `quantum_train/train.py` | Train loop, scheduler, checkpoint и resume |
| Дообучение | `quantum_train/finetune.py` | Продолжение обучения на подготовленных наборах данных |
| Память | `quantum_memory/memory.py` | SQLite, изоляция пользовательских записей через user_id, embeddings |
| Рассуждения | `quantum_reasoning/reasoning.py` | AST-парсер с жёстким whitelist безопасных операций |
| Поиск | `quantum_search/search.py` | Поиск в интернете с проверками DNS/IP, редиректов и SSRF |
| Зрение | `quantum_vision/vision.py` | CNN-признаки, spatial tokens, projection и cross-attention |

## Зафиксированные детали токенизатора

- Special token IDs: 0–4.
- Byte token IDs: 5–260.
- Первый BPE merge ID: 261.
- ASCII `a` имеет ID 102 (97 + 5).
- Первое слияние пары `a a` должно использовать IDs (102, 102).
- Последующие merges должны ссылаться на реально созданные предыдущие token IDs.

Полный словарь merges и точная таблица специальных токенов ещё не восстановлены.

## Архитектура Transformer

Описанная конфигурация использует PyTorch decoder-only Transformer с causal mask, RMSNorm, Grouped-Query Attention, SwiGLU и scaled dot-product attention. Число слоёв, hidden size, размеры голов, RoPE-параметры и число параметров требуют отдельной фиксации.

## Генерация

Планируются top-k и top-p sampling, repetition penalty, streaming и инкрементальное декодирование UTF-8. Поведение EOS и stop sequences должно быть покрыто тестами.

## Память и безопасность

Память должна изолироваться по user_id. Reasoning-компонент должен разбирать выражения в AST и разрешать только явно перечисленные узлы и функции. Нельзя исполнять произвольный Python.

Поиск должен блокировать loopback, private, link-local и reserved IP, повторно проверять DNS, контролировать фактический IP соединения и проверять каждый redirect. Одних предварительных DNS-проверок недостаточно.

## Vision

Экспериментальная схема: CNN извлекает признаки изображения; признаки преобразуются в spatial tokens; projection приводит их к размерности языковой модели; cross-attention связывает визуальные признаки с текстом. Реальный image inference пока не подтверждён.

## Исторические проверки, которые необходимо повторить

1. Проверить byte ID: ASCII `a` = 102.
2. Проверить первый BPE merge: (102, 102).
3. Проверить, что следующий merge ссылается на ID 261, а не на произвольный ID.
4. Проверить DNS pinning, реальные IP соединения и redirect chains.
5. Проверить рекурсивное сравнение scheduler state для Tensor, dict и list.
6. Проверить конкурентный доступ к памяти с таймаутами и без deadlock.

## Чего пока нет в репозитории

На момент фиксации документа полноценные исходники перечисленных модулей, tokenizer.json, checkpoint-файлы (например latest.pt / backup.pt) и подтверждённые логи обучения не найдены. Эти файлы нельзя считать существующими или рабочими до фактического добавления и проверки.

Следующий технический этап — восстановить и реализовать исходники токенизатора, модели и генерации, затем покрыть их тестами. Только после этого можно подключать настоящее inference ядро к веб-интерфейсу.
