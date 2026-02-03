/*
  Warnings:

  - A unique constraint covering the columns `[context,origin,destination,departDate,returnDate]` on the table `DealSeen` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "DealSeen_origin_destination_departDate_returnDate_key";

-- CreateIndex
CREATE UNIQUE INDEX "DealSeen_context_origin_destination_departDate_returnDate_key" ON "DealSeen"("context", "origin", "destination", "departDate", "returnDate");
