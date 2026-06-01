-- DropIndex
DROP INDEX "portfolio_snapshots_granularity_timestamp_idx";

-- CreateIndex
CREATE INDEX "Transaction_user_id_symbol_createdAt_idx" ON "Transaction"("user_id", "symbol", "createdAt");

-- CreateIndex
CREATE INDEX "portfolio_snapshots_user_id_granularity_timestamp_idx" ON "portfolio_snapshots"("user_id", "granularity", "timestamp");
