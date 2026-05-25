# 📘 Crypto Portfolio Tracker — Техническая архитектура и потоки данных

## 🔹 Обзор
Полнофункциональное приложение для учёта крипто-инвестиций, расчёта PnL (реализованного/нереализованного), визуализации динамики портфеля и отслеживания рыночных цен в реальном времени.

**Стек:**
- **Backend:** NestJS, Prisma, PostgreSQL, Redis, Socket.IO, `@nestjs/schedule`
- **Frontend:** React 18+, TypeScript, React Query, React Hook Form + Zod, Socket.IO Client
- **Внешние API:** CoinGecko (`/coins/markets`, `/search`)
- **Архитектурный принцип:** Бэкенд — единственный источник правды для финансовых расчётов. Фронтенд — чистый слой отображения с декларативным управлением состоянием.

---

## 🔹 Ключевые архитектурные принципы
1. **Single Source of Truth для финансов:** Вся математика PnL, ROI, средней цены и балансов выполняется на бэкенде (`calculatePortfolio.ts`). Фронтенд только отображает готовые метрики.
2. **Single-Coin кэширование:** Каждая монета кэшируется отдельно в Redis (`market:coin:SYMBOL`, TTL 300s). Запросы собираются из индивидуальных ключей, недостающие догружаются одним батчем.
3. **Fire-and-Forget пересчёт:** Создание/удаление транзакций мгновенно возвращает HTTP-ответ. Пересборка истории (`rebuild()`) запускается асинхронно в фоне, не блокируя UI.
4. **React Purity & Idempotency:** Фронтенд соблюдает правила React Compiler. Нет `setState` в рендере, нет impure-вызовов, эффекты только для синхронизации с внешними системами (RHF, WS, DOM).
5. **Защита от Race Conditions:** Promise-lock в `MarketService`, Redis distributed lock для кронов, атомарные транзакции Prisma при замене снимков.

---

## 🔹 Потоки данных (Data Flow)

### 1️⃣ Старт приложения и инициализация рынка
1. NestJS запускается → `MarketService.onModuleInit()` считывает все уникальные символы из БД.
2. Выполняется пакетный запрос к CoinGecko API.
3. Каждая монета сохраняется в Redis: `market:coin:SYMBOL` (TTL 300s).
4. Фронтенд подключается к WS (`/market`) → получает `market:ttl_sync` с меткой `nextUpdateAt`.
5. Индикатор `CircularTtlIndicator` начинает обратный отсчёт. UI рендерится мгновенно из кэша.

### 2️⃣ Добавление транзакции (BUY / SELL)
1. Пользователь вводит символ → теряет фокус → `useSymbolValidation` вызывает `GET /market?symbols=SYM`.
2. Бэкенд проверяет `market:coin:SYM`. При промахе догружает с API, кэширует, возвращает.
3. Фронтенд блокирует сабмит, если `marketPrice === 0` или тикер не найден.
4. При валидном символе → `POST /transactions` → Prisma сохраняет запись → мгновенный `201 Created`.
5. В фоне запускается `snapshotService.rebuild()` (fire-and-forget).
6. Фронтенд диспатчит `portfolio:transaction:success` → React Query инвалидирует `['portfolio']` и `['market']`.
7. UI обновляется без задержек. Фоновый пересчёт завершается молча.

### 3️⃣ Отображение портфеля и расчёт PnL
1. `GET /portfolio` → `PortfolioService` загружает все транзакции и запрашивает актуальные цены из Redis.
2. `calculatePortfolio()` группирует сделки по символу, сортирует хронологически и применяет **Average Cost Basis**:
   - `BUY`: увеличивает `amount`, `costBasis`, `totalBought`.
   - `SELL`: фиксирует `realizedPnl = (price - avgPrice) * sellAmount`, уменьшает `costBasis`, обновляет `totalSold`.
   - При закрытии позиции (`amount <= 0`) → `costBasis = 0`.
3. Итоговые метрики:
   - `netInvested = totalBought - totalSold` (реальный капитал)
   - `unrealizedPnl = currentValue - costBasis`
   - `totalPnl = realizedPnl + unrealizedPnl`
   - `totalPnlPercent = (totalPnl / netInvested) * 100`
4. Бэкенд возвращает обогащённый `PortfolioItem[]`. Фронтенд маппит данные напрямую в `PortfolioSummary` и `PortfolioCard`. Клиентская математика отсутствует.

### 4️⃣ Real-time обновления (WebSocket)
1. `MarketGateway` управляет пространством имён `/market`.
2. Каждые 5 минут (`CronExpression.EVERY_5_MINUTES`) при наличии активных клиентов:
   - `refreshMarketCache()` обновляет цены.
   - Redis single-кэши перезаписываются.
   - Broadcast `market:sync` с `nextUpdateAt` и payload.
3. `useMarketSocket` на фронте:
   - Обновляет `nextUpdateAt` → двигает TTL-индикатор.
   - Инвалидирует React Query → UI получает свежие цены и PnL.
4. Фоллбэк: при разрыве WS таймер на фронте срабатывает ровно в `nextUpdateAt` и запрашивает данные через HTTP.

### 5️⃣ Фоновая аналитика и снимки (Snapshots)
1. `PortfolioSnapshotService` работает по расписанию:
   - `*/5 * * * *`: добавляет точку `1h`, если последняя старше 4 минут (защита Redis lock + timestamp guard).
   - `0 * * * *`: фоновое обновление цен (поддерживает Redis тёплым без WS-клиентов).
   - Rollup-кроны (`1h→1d`, `1d→1w`, `1w→1m`): агрегируют историю, очищают устаревшие точки.
2. `rebuild()`: вызывается при CRUD транзакций. Восстанавливает баланс хронологически, генерирует `1h` точки, атомарно заменяет старые через `prisma.$transaction`.
3. `GET /analytics/portfolio-index?range=...`: возвращает до 60 точек. При отсутствии старшей гранулярности автоматически падает на `1h` с информативным логом.

---

## 🔹 Стратегия кэширования и производительности

| Слой | Механизм | Назначение |
|------|----------|------------|
| **Redis Single-Coin** | `market:coin:SYMBOL` (TTL 300s) | Устраняет N+1 запросов, позволяет частичные hit/miss |
| **Promise-Lock** | `refreshPromise: Promise \| null` | Гарантирует один API-вызов при конкурентных cache miss |
| **Distributed Lock** | `SET key 1 EX 30 NX` | Предотвращает дублирование кронов при overlap или масштабировании |
| **React Query** | `staleTime: 30_000`, background refetch | Минимизирует сетевые вызовы, синхронизирует вкладки |
| **Backend Calculation** | `calculatePortfolio()` | Детерминированный PnL, нулевая нагрузка на клиент, консистентность |

---

## 🔹 Управление состоянием (Frontend)

| Тип состояния | Инструмент | Принцип |
|---------------|------------|---------|
| **Server State** | `@tanstack/react-query` | Кэш, инвалидация по WS/событиям, оптимистичные обновления не используются (финансы требуют точности) |
| **Form State** | `react-hook-form` + `zod` | Неконтролируемые инпуты, валидация на blur/submit, нулевые ререндеры при вводе |
| **Real-time** | `socket.io-client` + `useMarketSocket` | Синхронизация TTL, инвалидация кэша, фоллбэк-таймер при обрыве |
| **Local UI** | `useState` / `useMemo` | Только для визуальных флагов (`isVerifyingSymbol`, `sellAll`, `useTodayDate`) |
| **Purity** | React Compiler rules | Нет `setState` в рендере, `Date.now()` только в lazy initializers, эффекты строго для внешних систем |

---

## 🔹 Обработка ошибок и отказоустойчивость

| Сценарий | Защита |
|----------|--------|
| **CoinGecko 429 / Timeout** | `catch` в `refreshMarketCache` возвращает `[]`, старый кэш **не перезаписывается**. UI работает на последних валидных данных. |
| **Несуществующий тикер** | Фронтенд блокирует сабмит. Бэкенд кэширует `__NOT_FOUND__` (TTL 5m) → защита от API-спама при опечатках. |
| **Race Condition при cache miss** | Promise-lock гарантирует один fetch. Все concurrent-запросы ждут один `Promise`. |
| **Дублирование кронов** | Redis distributed lock + проверка `last.timestamp > 4 min ago`. |
| **Потеря WS-соединения** | Фоллбэк-таймер в `useMarketSocket` инвалидирует кэш ровно в `nextUpdateAt`. Индикатор показывает статус подключения. |
| **Конфликт транзакций** | `prisma.$transaction` для атомарной замены снимков. `P2002` обработка в `CoinResolverService` при конкурентном upsert. |

---

## 🔹 Структура проекта (ключевые модули)

```
back/src/
├── modules/market/          # CoinGecko, кэш, WS-шлюз, резолвер символов
├── modules/portfolio/       # calculatePortfolio.ts, агрегация, DTO
├── modules/transaction/     # CRUD, валидация, мапперы
├── analytics/               # SnapshotService, rollup-кроны, IndexController
└── redis/                   # ioredis клиент, acquireLock, TTL-утилиты

front/src/
├── hooks/                   # React Query обёртки, useMarketSocket
├── components/TransactionForm/ # Декомпозированная форма, useSymbolValidation
├── components/Portfolio/    # Summary, Card, Grid, AssetSummary
└── utils/                   # formatCoinName, (calculateAssetPosition удалён → расчёт на бэке)
```

---

## 🔹 Рекомендации для Production

1. **Health Checks:** Добавить `/health` с проверкой Prisma, Redis и доступности CoinGecko.
2. **Мониторинг:** Логировать `pttl` ключей, время выполнения `rebuild()`, лаг snapshot-кронов, частоту cache miss.
3. **Rate Limiting:** Настроить `@nestjs/throttler` на `/market` и `/transactions`. Добавить ротацию API-ключей CoinGecko.
4. **Масштабирование:** Бэкенд stateless. Redis выступает shared cache. Prisma connection pooling + PgBouncer при высокой нагрузке.
5. **Тестирование:** 
   - E2E для `rebuild()` с моком транзакций и цен
   - Unit для `calculatePortfolio()` (шорты, закрытия, ретроактивные правки)
   - WS integration тесты для `market:sync` и TTL-синхронизации
6. **Безопасность:** Валидация DTO на уровне `class-validator`, CORS whitelist, HTTPS/WSS в prod, экранирование логов (PII/keys).

---

📄 *Документ отражает актуальное состояние архитектуры после переноса финансовых расчётов на бэкенд, внедрения single-coin кэша, декомпозиции формы и соблюдения правил React Purity. Все потоки данных детерминированы, кэширование многоуровневое, UI реактивен и не блокирует бизнес-логику.*