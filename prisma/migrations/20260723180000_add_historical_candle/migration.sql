-- AlterTable
ALTER TABLE "Stock" ADD COLUMN "exchange" TEXT NOT NULL DEFAULT 'NSE';

-- CreateTable
CREATE TABLE "HistoricalCandle" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "volume" DOUBLE PRECISION,

    CONSTRAINT "HistoricalCandle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ticker_date" ON "HistoricalCandle"("ticker", "date");
