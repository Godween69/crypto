-- CreateTable
CREATE TABLE "portfolio_snapshots" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "granularity" TEXT NOT NULL,
    "totalValue" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "portfolio_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "portfolio_snapshots_granularity_timestamp_idx" ON "portfolio_snapshots"("granularity", "timestamp");
