# Planning & État des Lieux – Projet OKKAZ

**Date de mise à jour :** 13 Mai 2026  
**Projet :** OKKAZ — Marketplace de location de biens au Bénin  
**Objectif :** Suivi des réalisations et roadmap vers la production.

---

## 1. État des Lieux (Réalisations passées : S-4 à S-1)

| Période | Phase | Réalisations principales | Responsable | Statut |
|---------|-------|--------------------------|-------------|--------|
| **S-4** | **Initialisation Backend** | - Setup Node.js, Express, Prisma, PostgreSQL.<br>- Modélisation base de données (12 tables métiers). | Spynel | ✅ Terminé |
| **S-3** | **Modules Métier (API)** | - Création des modules Auth JWT, Annonces, Catégories.<br>- Filtres de recherche, Abonnements. | Spynel | ✅ Terminé |
| **S-2** | **Modules Avancés & Docs** | - Module KYC, Avis, Demandes, Signalements.<br>- Documentation Swagger, Tests d'intégration (Jest). | Spynel | ✅ Terminé |
| **S-1** | **Infrastructure & CI/CD** | - Dockerisation (API & BDD) via `docker-compose`.<br>- Déploiement sur le serveur de **Staging**. | Larioce | ✅ Terminé |

---

## 2. Roadmap vers le Déploiement (Tâches restantes : S1 à S6)

| Période | Phase | Tâches détaillées | Responsable | Statut |
|---------|-------|-------------------|-------------|--------|
| **S1** | **Conception UI/UX & Paiements** | - **Front :** Création des maquettes (Figma/AdobeXD), choix graphiques et validation du design.<br>- **Back :** Implémentation du webhook de paiement (KKiapay). | Emmanuela (Front)<br>Spynel (Back) | ✅ Terminé (Back) / ⏳ En cours (Front) |
| **S2** | **Setup Front & Intégration Statique** | - **Front :** Configuration du projet web (Vite/Tailwind) et intégration statique des vues principales.<br>- **Back :** Tests complets et validation des flux de paiements. | Emmanuela (Front)<br>Spynel (Back) | ⏳ À faire |
| **S3** | **Développement Front (Logique)** | - **Front :** Création des formulaires (Auth, création d'annonces, upload d'images).<br>- Dynamisation des composants interactifs sans connexion backend. | Emmanuela | ⏳ À faire |
| **S4** | **Connexion API (Front ↔ Back)** | - **Front :** Appels API (Axios/Fetch) vers le backend Node.js (Endpoints `/api/v1`).<br>- Gestion globale des états (JWT, Refresh Token, Loaders, Erreurs). | Emmanuela<br>(Support: Spynel) | ⏳ À faire |
| **S5** | **Recette & Tests de Bout-en-Bout** | - **Transverse :** Déploiement sur Staging pour tests croisés (QA).<br>- Vérification UX/UI mobile (Responsive), SEO, et correction des bugs identifiés. | Emmanuela, Spynel & Larioce | ⏳ À faire |
| **S6** | **Déploiement Production (Go-Live)** | - **Transverse :** Configuration finale (DNS, certificats SSL/TLS).<br>- Déploiement propre en production.<br>- Smoke tests (Validation du bon fonctionnement en live). | Emmanuela, Spynel & Larioce | ⏳ À faire |

---

## 📌 Jalons Clés (Milestones)

- 🎯 **Fin S2 :** Design validé et pages web intégrées. Intégration paiement terminée.
- 🎯 **Fin S4 :** L'interface web est 100% connectée à l'API et fonctionnelle.
- 🎯 **Fin S5 :** Phase de test terminée, aucun bug bloquant sur le serveur Staging.
- 🚀 **Fin S6 : Lancement officiel en Production.**
