/*
  Warnings:

  - A unique constraint covering the columns `[context,origin,destination,departDate,returnDateKey]` on the table `DealSeen` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "DealSeen_context_origin_destination_departDate_returnDate_key";

-- AlterTable
ALTER TABLE "DealSeen" ADD COLUMN     "returnDateKey" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "DealSeen_context_origin_destination_departDate_returnDateKe_key" ON "DealSeen"("context", "origin", "destination", "departDate", "returnDateKey");
