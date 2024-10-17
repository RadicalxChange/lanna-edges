/*
  Warnings:

  - You are about to drop the column `velocity` on the `Account` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Account" DROP COLUMN "velocity",
ADD COLUMN     "recent_earnings" INTEGER NOT NULL DEFAULT 0;
