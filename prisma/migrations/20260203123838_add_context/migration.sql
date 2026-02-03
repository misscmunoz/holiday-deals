-- CreateTable
CREATE TABLE "DealSeen" (
    "id" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "departDate" TEXT NOT NULL,
    "returnDate" TEXT,
    "lastPrice" DOUBLE PRECISION NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAlertedAt" TIMESTAMP(3),

    CONSTRAINT "DealSeen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DealSeen_origin_destination_departDate_returnDate_key" ON "DealSeen"("origin", "destination", "departDate", "returnDate");
