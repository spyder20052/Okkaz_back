# Module Subscriptions (Abonnements / Devenir Pro)

OKKAZ se veut accessible pour les vendeurs standards, mais propose une mise en vitrine "PRO" via abonnement. 
Le `subscriptions.service` gère les passages aux rangs supérieurs des `SELLER`.

## Souscriptions PRO

- Un utilisateur lance un achat d'abonnement (`initiateSubscription`). Le provider envoie cela au module payment webhook.
- Lors de la validation par le Webhook, la souscription en base est activée avec `startDate` & `endDate`.
- L'utilisateur est basculé informatiquement en Rôle/Scope logique `PRO`. 
- Chron Tâches : Des vérifications régulières devront idéalement inspecter les `endDate` pour révoquer automatiquement le statut en basculant à `EXPIRED`.
