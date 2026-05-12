📘 Market + Coin Resolver — как течёт поток данных
🧠 Общая идея системы

Система построена вокруг идеи:

CoinGecko = внешний источник, Prisma DB = локальная память, Resolver = интеллект между ними

🔄 Общий поток данных
📌 1. Запрос с фронтенда

Фронт отправляет символы монет:

BTC, ETH, ADA
📌 2. MarketController

Запрос попадает в:

MarketController → MarketService

MarketService не знает ничего о CoinGecko напрямую.

Он только говорит:

"дай мне данные по символам"
📌 3. MarketService → CoinResolverService

MarketService делает:

resolveMany(symbols)
🧩 CoinResolverService — центральная логика

Это самый важный слой.

Он превращает:

BTC → bitcoin
ETH → ethereum
⚙️ Как работает resolve(symbol)
📌 Шаг 1 — Memory Cache (самый быстрый)

Сначала проверяется RAM Map:

BTC → map.get("BTC")
если найдено:

✔ возвращаем сразу
❌ никаких запросов в БД или API

📌 Шаг 2 — База данных (Prisma)

Если в памяти нет:

SELECT * FROM Coin WHERE symbol = 'BTC'
если найдено:

✔ кладём в memory cache
✔ возвращаем geckoId

📌 Шаг 3 — CoinGecko API (fallback)

Если в БД тоже нет:

делается запрос:

GET /search?query=btc

CoinGecko возвращает список:

[
  { id: "bitcoin", symbol: "btc", name: "Bitcoin" }
]
📌 Шаг 4 — выбор лучшего совпадения

Берётся:

data.coins[0]

(самый релевантный результат)

📌 Шаг 5 — сохранение в БД

Если монета новая:

INSERT INTO Coin
(symbol, geckoId, name)
📌 Шаг 6 — обновление memory cache
map.set("BTC", "bitcoin")
📌 Шаг 7 — возврат результата

Теперь Resolver возвращает:

BTC → bitcoin
💰 MarketService — получение цен

После резолва:

BTC, ETH → bitcoin, ethereum
📌 Запрос к CoinGecko

MarketService делает:

GET /simple/price

Пример:

ids=bitcoin,ethereum
vs_currencies=usd
include_24hr_change=true
📌 Ответ CoinGecko
{
  bitcoin: { usd: 65000, usd_24h_change: 2.1 },
  ethereum: { usd: 3200, usd_24h_change: -1.2 }
}
📌 Формирование ответа

MarketService превращает это в:

[
  {
    symbol: "BTC",
    currentPrice: 65000,
    change24h: 2.1
  }
]
⚡ Кэширование
📌 MarketService cache
ids → result
TTL = 30 секунд

👉 уменьшает количество запросов к CoinGecko

📌 CoinResolver memory cache
BTC → bitcoin
ETH → ethereum

👉 ускоряет резолв в 100–1000 раз

🧠 Почему система теперь стабильная
❌ раньше было:
/coins/list (17k записей)
мусорные символы
неправильные совпадения
BTC → random token
✅ теперь:
только lazy resolution
только нужные монеты
БД = источник истины
CoinGecko = fallback
📊 Итоговая схема
FRONT
  ↓
MarketController
  ↓
MarketService
  ↓
CoinResolverService
  ↓
  1. Memory Map
  2. Prisma DB
  3. CoinGecko /search
  ↓
CoinGecko /simple/price
  ↓
MarketService cache
  ↓
FRONT
🚀 Ключевая идея архитектуры

Система не хранит 17 000 монет
Она хранит только то, что реально используется