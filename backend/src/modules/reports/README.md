# Module Reports (Signalements)

Le web c'est la jungle ! Des fausses annonces, des utilisateurs frauduleux ou des injures. Le module de signalement (`Reports`) permet aux utilisateurs de flagger une entité (une `Annonce` ou un `Utilisateur`).

## Enjeux Back-end

- Validation stricte des IDs pour confirmer l'existence de la resource.
- Traitement de volume : Limiteur de rate / throttling pour les abus de reports.
- Gestion d'un score de confiance caché : une entitée très reportée déclenchera une alerte au sein du `Admin Dashboard`.
- Les reports sont traités manuellement (`PENDING` -> `RESOLVED` / `DISMISSED`) par les Modérateurs de type `ADMIN`.
