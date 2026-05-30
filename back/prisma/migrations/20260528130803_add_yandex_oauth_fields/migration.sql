/*
  Warnings:

  - A unique constraint covering the columns `[yandex_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('CREDENTIALS', 'YANDEX');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "auth_provider" "AuthProvider" NOT NULL DEFAULT 'CREDENTIALS',
ADD COLUMN     "yandex_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_yandex_id_key" ON "users"("yandex_id");
