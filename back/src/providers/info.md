1. Старт приложения:
   • onModuleInit() читает src/assets/coinlore-assets.json с диска
   • Парсинг 1.2 МБ JSON локально занимает ~50 мс
   • isMapLoaded = true мгновенно
   • Никаких сетевых запросов на старте!

2. Запрос /market?symbols=BTC,ETH:
   • refreshMarketCache() → CoinLore.fetch(['BTC', 'ETH'])
   • Резолвинг: BTC→'90', ETH→'80' (из памяти)
   • GET /api/ticker/?id=90,80 (ответ ~2 КБ)
   • Сеть справляется с 2 КБ легко → возврат цен
   • Данные в Redis → фронтенд

3. Fallback:
   • Если /api/ticker/ упадет (маловероятно для 2 КБ) → CoinGecko
   • Если файла нет на диске → CoinLore пропускается, работает только CoinGecko

Как теперь течёт данные (Обучающий разбор)
Появление новой монеты (например, IRON):
Пользователь создает транзакцию BUY IRON. Срабатывает triggerRebuild -> refreshMarketCache.
ШАГ 0: Сервис проверяет Redis: GET market:image:IRON. Возвращает null.
Символ IRON попадает в массив missing.
Вызывается coingeckoProvider.loadMetadata(['IRON']).
Делается один запрос GET /search?query=IRON. CoinGecko возвращает id: "iron-bastard" (или что там у него) и large: "https://.../iron.png".
URL картинки сохраняется в Redis на 30 дней. geckoId сохраняется в таблицу Coin.
Запрос цен:
ШАГ 1: CoinLore резолвит IRON в свой внутренний ID и отдает цену.
ШАГ 2: CoinGecko не вызывается для цен, так как CoinLore справился.
Обогащение: Перед отдачей на фронт сервис читает market:image:IRON из Redis и подставляет URL в объект с ценой.
Повторные запросы:
При следующих обновлениях (каждые 5 минут) ШАГ 0 видит, что картинка уже есть в Redis, и вообще не идёт в CoinGecko. Лимиты API не тратятся.

1. Появление новой монеты (TRUMP):
   • MarketService видит, что в Redis нет ключа market:image:TRUMP.
   • Делает ОДИН запрос в CoinGecko /search?query=TRUMP.
   • Получает { geckoId: "official-trump", image: "https://.../large.png" }.

2. Распределение данных (Разделение ответственности):
   • geckoId → сохраняется в PostgreSQL (таблица Coin) навсегда. 
     Это наш надёжный якорь для API CoinGecko.
   • image → сохраняется в Redis (ключ market:image:TRUMP) на 30 дней. 
     Это наш быстрый in-memory CDN.

3. Запрос цен (каждые 5 минут):
   • CoinLore отдаёт цену (быстро, без картинок).
   • MarketService читает URL из Redis (за 1 мс).
   • Склеивает { price: 1.97, image: "https://..." } и отдаёт на фронтенд.