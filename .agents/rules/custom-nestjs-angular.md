---
name: custom-nestjs-angular
description: Règles strictes d'intégration entre le frontend Angular et le backend NestJS existant.
trigger: always_on
---

# Règle Absolue : Le Backend NestJS Existe Déjà

C'est une règle CRITIQUE pour ce projet. Le frontend Angular doit **consommer l'API NestJS existante**.
Il est STRICTEMENT INTERDIT de :
- Créer un backend parallèle ou une API fictive.
- Utiliser json-server si l'API réelle existe.
- Créer des endpoints imaginaires ou inventer des réponses API.
- Dupliquer la logique métier du backend dans Angular.

**Avant d'implémenter une fonctionnalité Angular :**
1. Rechercher les endpoints NestJS existants.
2. Rechercher les DTO, modèles/interfaces, routes, et réponses API.
3. Rechercher les services Angular, interceptors, et guards existants pour les réutiliser.
Si une information backend manque, signalez-la au lieu de l'inventer.

# Architecture Angular (Modulaire)

L'architecture suit une organisation stricte :
```
src/
├── app/
├── core/
│   ├── auth/
│   ├── guards/
│   ├── interceptors/
│   ├── services/
│   ├── http/
│   └── config/
├── shared/
│   ├── components/
│   ├── directives/
│   ├── pipes/
│   └── utils/
└── features/
    └── nom-du-module/
        ├── pages/
        ├── components/
        ├── services/
        ├── hooks/
        ├── utils/
        ├── validations/
        ├── enums/
        ├── models/
        └── routes/
```
Chaque module (feature) doit être autonome. La logique métier va dans les services. Les appels HTTP dans les services API. Les validations spécifiques dans `validations/`.

# Appels HTTP et TypeScript

- **Services** : Tous les appels HTTP passent par une couche de service (Component -> Service -> API Service -> HttpClient). Ne pas utiliser HttpClient directement dans les composants.
- **Centralisation** : Base URL, headers, authentification, retry, refresh token, interceptors.
- **TypeScript Strict** : Éviter `any` ou `as any` (sauf justification claire). Aligner les interfaces avec les DTO NestJS. Gestion correcte des valeurs `null`/`undefined`.

# RxJS, Validation et Authentification

- **RxJS** : Éviter les subscriptions inutiles et les memory leaks. Utiliser le pipe `async`, `Signals` et `takeUntilDestroyed` lorsque cela est pertinent.
- **Formulaires** : Validations côté frontend pour l'UX, mais le backend NestJS reste la source de vérité. Pas de fichier de validation global géant.
- **Authentification** : Analyser le mécanisme existant (login, logout, JWT, expiration, rôles). Ne pas stocker de secrets (JWT secrets, API keys) dans le frontend. Gérer les erreurs 401/403 proprement.

# Tests et Qualité

- **Tests** : Favoriser les tests des services, guards, interceptors et validations.
- **Qualité de code** : Respecter SOLID, SRP, DRY, KISS. Séparation des responsabilités. Pas de fichiers géants.
- **Performance** : Lazy loading, OnPush, Signals (si pertinent), optimisation HTTP.
- **Sécurité** : Angular n'est pas une frontière de sécurité. La sécurité métier est gérée par NestJS (XSS, token, CORS, etc.).

# Workflow Obligatoire
ANALYSE -> RECHERCHE DU CODE EXISTANT -> RECHERCHE DE L'API NESTJS -> PLAN -> IMPLEMENTATION -> TESTS -> TYPE CHECK -> LINT -> CODE REVIEW.

Ne pas créer de doublons (components, services, interfaces). Cherchez toujours l'existant avant de créer.
Respecter scrupuleusement les erreurs (statuts HTTP et formats) retournées par NestJS.
