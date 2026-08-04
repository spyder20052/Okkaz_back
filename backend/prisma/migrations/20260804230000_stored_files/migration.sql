-- Stockage des fichiers en base (Neon) : photos d'annonces publiques,
-- pièces KYC privées (servies avec contrôle d'accès par l'API).
CREATE TABLE "stored_files" (
    "id" UUID NOT NULL,
    "mime" VARCHAR(100) NOT NULL,
    "data" BYTEA NOT NULL,
    "folder" VARCHAR(255) NOT NULL,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "owner_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stored_files_pkey" PRIMARY KEY ("id")
);
