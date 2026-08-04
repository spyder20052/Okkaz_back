-- Tous les comptes peuvent consulter et acheter. BUYER n'est donc plus un rôle.
UPDATE "users" SET "role" = 'SELLER' WHERE "role" = 'BUYER';

ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
CREATE TYPE "UserRole" AS ENUM ('SELLER', 'SELLER_PRO', 'ADMIN');
ALTER TABLE "users"
  ALTER COLUMN "role" TYPE "UserRole"
  USING ("role"::text::"UserRole");
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'SELLER';
DROP TYPE "UserRole_old";
