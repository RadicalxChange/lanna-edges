/*
  Warnings:

  - You are about to drop the column `recent_earnings` on the `Account` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Account" DROP COLUMN "recent_earnings",
ADD COLUMN     "value_creation" INTEGER NOT NULL DEFAULT 0;
