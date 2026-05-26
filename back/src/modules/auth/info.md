Как течёт данные и почему это работает:
Регистрация/Логин (@Public): Guard пропускает → сервис хэширует пароль → создаёт User → генерирует JWT → сохраняет RefreshSession → возвращает токены в httpOnly cookies.
Обычный запрос: Cookie access_token → JwtStrategy верифицирует → request.user → UserContextMiddleware → CLS → PrismaService.x автоматически фильтрует по userId.
Refresh: Cookie refresh_token → поиск сессии → проверка fingerprint → ротация (удаление старой, создание новой) → новые токены в cookie.
Кража токена: Несовпадение fingerprint → удаление ВСЕХ сессий → легитимный пользователь получает 401 при следующем действии.
WebSocket: JwtWsGuard валидирует токен из cookie/header → socket.data.user → подписка на room:user:{id}.
Глобальная защита: APP_GUARD делает все маршруты защищёнными по умолчанию. Только @Public() маршруты доступны без токена.
