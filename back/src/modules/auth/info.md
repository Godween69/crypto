Как течёт данные и почему это работает:
Регистрация/Логин (@Public): Guard пропускает → сервис хэширует пароль → создаёт User → генерирует JWT → сохраняет RefreshSession → возвращает токены в httpOnly cookies.
Обычный запрос: Cookie access_token → JwtStrategy верифицирует → request.user → UserContextMiddleware → CLS → PrismaService.x автоматически фильтрует по userId.
Refresh: Cookie refresh_token → поиск сессии → проверка fingerprint → ротация (удаление старой, создание новой) → новые токены в cookie.
Кража токена: Несовпадение fingerprint → удаление ВСЕХ сессий → легитимный пользователь получает 401 при следующем действии.
WebSocket: JwtWsGuard валидирует токен из cookie/header → socket.data.user → подписка на room:user:{id}.
Глобальная защита: APP_GUARD делает все маршруты защищёнными по умолчанию. Только @Public() маршруты доступны без токена.

1. Вход / Верификация
   POST /auth/login → AuthService.login()
   ↓
   Prisma возвращает пользователя: { id, email, role: 'USER' }
   ↓
   issueTokenPair() → создаёт JWT с payload: { sub, email, role }
   ↓
   Браузер получает httpOnly cookie: access_token (15m) + refresh_token (30d)

2. Каждый защищённый запрос
   GET /portfolio (с cookie)
   ↓
   JwtAuthGuard → извлекает токен → декодирует → JwtStrategy.validate()
   ↓
   request.user = { id: '...', email: '...', role: 'USER' } // роль берётся из токена, БД не трогается
   ↓
   Если маршрут помечен @Roles('ADMIN') → RolesGuard сравнивает request.user.role с требуемым
   ↓
   Совпадение → доступ разрешён. Нет → 403 Forbidden

3. Ротация токенов (каждые 15 минут)
   POST /auth/refresh → AuthService.refresh()
   ↓
   Находит сессию в БД → берёт session.user.role
   ↓
   Создаёт НОВЫЙ jwtPayload с role → подписывает новые токены
   ↓
   Роль сохраняется в новом access_token → RBAC продолжает работать без переавторизации