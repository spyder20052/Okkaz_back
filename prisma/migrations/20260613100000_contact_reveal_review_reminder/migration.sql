-- AlterTable
ALTER TABLE "contact_reveals" ADD COLUMN     "review_reminder_sent_at" TIMESTAMPTZ(6);

-- CreateIndex
CREATE INDEX "contact_reveals_review_reminder_sent_at_idx" ON "contact_reveals"("review_reminder_sent_at");

