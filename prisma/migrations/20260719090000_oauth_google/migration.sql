-- OAuth Google : les comptes créés via Google n'ont ni téléphone ni mot de passe.
ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL;
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN "google_id" VARCHAR(64);

CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");
