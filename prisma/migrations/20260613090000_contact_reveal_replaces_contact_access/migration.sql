-- AlterEnum
BEGIN;
CREATE TYPE "PaymentType_new" AS ENUM ('SUBSCRIPTION', 'DEMAND_LISTING', 'EXPRESS_DEMAND');
ALTER TABLE "payments" ALTER COLUMN "type" TYPE "PaymentType_new" USING ("type"::text::"PaymentType_new");
ALTER TYPE "PaymentType" RENAME TO "PaymentType_old";
ALTER TYPE "PaymentType_new" RENAME TO "PaymentType";
DROP TYPE "PaymentType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "contact_accesses" DROP CONSTRAINT "contact_accesses_listing_id_fkey";

-- DropForeignKey
ALTER TABLE "contact_accesses" DROP CONSTRAINT "contact_accesses_payment_id_fkey";

-- DropForeignKey
ALTER TABLE "contact_accesses" DROP CONSTRAINT "contact_accesses_user_id_fkey";

-- DropTable
DROP TABLE "contact_accesses";

-- CreateTable
CREATE TABLE "contact_reveals" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_reveals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_reveals_user_id_idx" ON "contact_reveals"("user_id");

-- CreateIndex
CREATE INDEX "contact_reveals_listing_id_idx" ON "contact_reveals"("listing_id");

-- CreateIndex
CREATE UNIQUE INDEX "contact_reveals_user_id_listing_id_key" ON "contact_reveals"("user_id", "listing_id");

-- AddForeignKey
ALTER TABLE "contact_reveals" ADD CONSTRAINT "contact_reveals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_reveals" ADD CONSTRAINT "contact_reveals_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

