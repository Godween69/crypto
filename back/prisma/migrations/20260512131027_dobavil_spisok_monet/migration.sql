-- CreateTable
CREATE TABLE "Coin" (
    "id" SERIAL NOT NULL,
    "symbol" TEXT NOT NULL,
    "geckoId" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Coin_symbol_key" ON "Coin"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "Coin_geckoId_key" ON "Coin"("geckoId");

-- CreateIndex
CREATE INDEX "Coin_symbol_idx" ON "Coin"("symbol");
