-- 1. Создаём таблицы пользователей и сессий ПЕРЕД использованием
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "display_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "refresh_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "fingerprint" TEXT,
    "ip" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "refresh_sessions_refresh_token_key" ON "refresh_sessions"("refresh_token");
CREATE INDEX "refresh_sessions_user_id_idx" ON "refresh_sessions"("user_id");

-- 2. Создаём bootstrap-пользователя для миграции существующих данных
-- Пароль: TempPassword123!
INSERT INTO "users" ("id", "email", "password_hash", "display_name", "created_at", "updated_at")
VALUES (
  'bootstrap-user-000000000000',
  'admin@crypto.local',
  '$2b$12$LJ3m4ys3Lg2VBe5E5bYake.IUJyZqjKdHfOeQwXxkRzQvTmYWeGKy',
  'Admin (Migration)',
  NOW(),
  NOW()
);

-- 3. Добавляем user_id как NULLABLE во избежание ошибки с существующими строками
ALTER TABLE "Transaction" ADD COLUMN "user_id" TEXT;
ALTER TABLE "portfolio_snapshots" ADD COLUMN "user_id" TEXT;

-- 4. Привязываем ВСЕ существующие записи к bootstrap-пользователю
UPDATE "Transaction" SET "user_id" = 'bootstrap-user-000000000000' WHERE "user_id" IS NULL;
UPDATE "portfolio_snapshots" SET "user_id" = 'bootstrap-user-000000000000' WHERE "user_id" IS NULL;

-- 5. Делаем колонки обязательными теперь, когда все строки заполнены
ALTER TABLE "Transaction" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "portfolio_snapshots" ALTER COLUMN "user_id" SET NOT NULL;

-- 6. Создаём внешние ключи с каскадным удалением
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "portfolio_snapshots" ADD CONSTRAINT "portfolio_snapshots_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "refresh_sessions" ADD CONSTRAINT "refresh_sessions_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 7. Создаём составные индексы для производительn