# Architecture — Renaissance

Application de gestion complète pour l'activité de coaching : CRM prospects, agenda,
conversion en clients, espace client (séances, programme, suivi hebdomadaire).

Stack : **Next.js (App Router, 100 % JavaScript) · PostgreSQL · Prisma**.

---

## 1. Principes directeurs

L'application est construite autour de trois règles, dans cet ordre de priorité :

1. **Découplage maximal / forte cohésion.** Chaque couche a une responsabilité unique
   et ne connaît que la couche directement en dessous d'elle.
2. **Évolutivité.** Les points prévus pour évoluer (statuts du pipeline, permissions,
   moteur de génération de programmes, thèmes de séances) sont **pilotés par les données**
   ou par des **registres extensibles**, jamais codés en dur.
3. **Pérennité.** Code commenté en français, conventions uniformes, aucune dépendance
   exotique (pas de librairie de graphiques, pas d'ORM maison : Prisma + SVG pur).

## 2. Les trois couches

```
┌─────────────────────────────────────────────────────────────┐
│  PRÉSENTATION                                               │
│  src/app/** (pages, layouts)  ·  src/components/**          │
│  Ne contient AUCUNE logique métier. Les pages serveur       │
│  appellent les services ; les composants client appellent   │
│  les routes API via fetch.                                  │
├─────────────────────────────────────────────────────────────┤
│  LOGIQUE MÉTIER                                             │
│  src/modules/<domaine>/*.service.js                         │
│  Fonctions pures métier : validation, règles, transactions. │
│  Aucune dépendance à HTTP, React ou Next (hors next/server  │
│  exclu : les services sont importables depuis un script).   │
├─────────────────────────────────────────────────────────────┤
│  ACCÈS AUX DONNÉES                                          │
│  prisma/schema.prisma  ·  src/lib/prisma.js (singleton)     │
│  Seuls les services touchent Prisma.                        │
└─────────────────────────────────────────────────────────────┘
```

Les **routes API** (`src/app/api/**`) sont volontairement des *adaptateurs fins* :
contrôle d'accès (`requireAuth`) → appel du service → sérialisation (`ok`/`fail`).
Une route ne contient jamais de logique métier ; on peut donc réécrire l'interface
(ou ajouter une app mobile) sans toucher au métier.

## 3. Arborescence commentée

```
renaissance/
├── prisma/
│   ├── schema.prisma          # Schéma complet de la base (source de vérité)
│   └── seed.js                # Données initiales : statuts, permissions, objectifs,
│                              # types de séances, exercices, compte admin
├── src/
│   ├── middleware.js          # Garde Edge : /admin → ADMIN/COACH, /espace → connecté
│   │
│   ├── lib/                   # Utilitaires transverses (aucune logique métier)
│   │   ├── prisma.js          # Singleton PrismaClient
│   │   ├── token.js           # JWT (jose) — compatible Edge, utilisé par le middleware
│   │   ├── session.js         # Cookie de session httpOnly (lecture/écriture)
│   │   ├── api.js             # ok / fail / requireAuth / handle / ApiError
│   │   ├── dates.js           # Semaine, jours fériés de format, libellés français
│   │   └── uploads.js         # Stockage des fichiers (photos) dans uploads/,
│   │                          # servis par /api/uploads (jamais publics)
│   │
│   ├── modules/               # ⭐ LOGIQUE MÉTIER, organisée par domaine
│   │   ├── auth/
│   │   │   ├── auth.service.js    # authentification, hash bcrypt, création d'utilisateurs
│   │   │   └── permissions.js     # système de permissions extensible (table + cache)
│   │   ├── crm/
│   │   │   ├── pipeline.service.js  # statuts du pipeline (CRUD, stockés en base)
│   │   │   └── prospect.service.js  # prospects + historique horodaté (ContactEvent)
│   │   ├── agenda/
│   │   │   ├── task.service.js         # tâches personnelles de l'admin
│   │   │   └── appointment.service.js  # demandes d'appel → planification → issue
│   │   ├── clients/
│   │   │   ├── client.service.js   # conversion prospect→client (transaction), fiches
│   │   │   ├── nutrition.js        # cible calories + macros (fonctions pures,
│   │   │   │                       # partagées fiche coach / espace client)
│   │   │   └── note.service.js     # carnet de notes privé du coach (ClientNote)
│   │   ├── sessions/
│   │   │   └── schedule.service.js # thèmes de séances, planning hebdo, objectifs,
│   │   │                           # filtrage des séances selon les objectifs du client
│   │   ├── programs/
│   │   │   ├── program.service.js         # génération, activation, archivage
│   │   │   ├── program-editor.service.js  # édition manuelle (jours, exercices)
│   │   │   │                              # + modèles réutilisables (isTemplate)
│   │   │   └── generation/
│   │   │       ├── registry.js     # ⭐ registre de stratégies (point d'extension)
│   │   │       └── generators/
│   │   │           └── basic.js    # générateur v1 (objectif + niveau + jours/semaine)
│   │   └── tracking/
│   │       ├── metric.service.js   # mesures hebdomadaires (upsert par semaine)
│   │       ├── performance.service.js  # force (PR + RPE), cardio, présence
│   │       ├── body.service.js     # mensurations + photos de progression
│   │       ├── cockpit.service.js  # règles « clients à risque » (RISK_RULES extensibles)
│   │       └── stats.js            # 1RM estimé, volume, moyenne mobile, projection
│   │
│   ├── app/                   # PRÉSENTATION — pages et routes API
│   │   ├── page.js                # accueil public
│   │   ├── rendez-vous/           # formulaire public de demande d'appel
│   │   ├── connexion/             # login (redirige selon le rôle)
│   │   ├── admin/                 # espace admin : dashboard, agenda, crm, crm/[id],
│   │   │                          # clients, clients/[id], seances, exercices,
│   │   │                          # cockpit (« qui a besoin de moi »),
│   │   │                          # seance-du-jour (logging tablette)
│   │   ├── espace/                # espace client : séances, programme, suivi
│   │   └── api/                   # ~24 routes, toutes des adaptateurs fins
│   │
│   └── components/            # Composants React (client) par zone
│       ├── admin/                 # AgendaBoard, CrmBoard, ProspectFile, ClientFile…
│       ├── espace/                # TrackingView
│       └── charts/LineChart.js    # graphique SVG pur, sans dépendance
│
├── ARCHITECTURE.md            # ce document
├── README.md                  # démarrage rapide (développeur)
└── GUIDE-HEBERGEMENT.md       # mise en ligne pas à pas (non-développeur)
```

## 4. Schéma de données (vue d'ensemble)

```
User (ADMIN | COACH | CLIENT)
 ├─ Permission / RolePermission     # permissions par rôle, extensibles en base
 └─ Client ──── Prospect            # lien 1-1 : l'historique CRM est CONSERVÉ
                 ├─ PipelineStatus  # statuts stockés en base (modifiables via l'UI)
                 ├─ ContactEvent    # historique horodaté : appels, notes, décisions,
                 │                  # changements de statut, événements système
                 └─ Appointment     # demandes d'appel (formulaire public) → agenda

Task                                # tâches personnelles de l'admin (agenda)

Goal ── ClientGoal ── Client        # objectifs du client
Goal ── SessionTypeGoal ── SessionType ── WeeklySlot   # planning hebdo par thème
        (un client ne voit que les créneaux dont le thème correspond à ses objectifs ;
         un thème sans objectif lié est ouvert à tous)

Exercise                            # bibliothèque d'exercices
Program (DRAFT|ACTIVE|ARCHIVED)     # + generatorKey + generationParams (JSON archivé)
 │                                  # + isTemplate : modèle réutilisable (copie
 │                                  #   appliquée à un client, jamais « actif »)
 └─ ProgramSession └─ ProgramExercise (séries, répétitions, repos, tempo)

BodyMeasurement                     # mensurations datées (tours, % masse grasse)
ProgressPhoto (FRONT|SIDE|BACK)     # photos avant/après, fichiers dans uploads/
ClientNote                          # carnet privé du coach — JAMAIS côté client
StrengthLog.rpe                     # effort ressenti 1-10, saisi en séance
Client : bilan initial (blessures, médical, dispos, matériel, expérience)
       + cible nutrition (calorieTarget / protein / carb / fat, vide = calculée)

WeeklyMetric                        # 1 ligne / client / semaine (poids, énergie,
                                    # séances suivies, notes, champ JSON `custom`
                                    # pour des mesures futures sans migration)
```

Décisions notables :

- **Statuts du pipeline en base** (`PipelineStatus` : clé, libellé, couleur, position,
  drapeaux `isWon`/`isLost`). Ajouter ou renommer un statut se fait dans l'interface,
  sans migration ni redéploiement. La conversion prospect→client se déclenche sur le
  statut marqué `isWon`.
- **Conversion sans perte** : le `Client` garde une référence unique vers son `Prospect`
  d'origine ; tout l'historique (`ContactEvent`) reste consultable depuis la fiche client.
- **`WeeklyMetric.custom` (JSON)** : permet d'ajouter de nouvelles mesures
  (tour de taille, sommeil…) sans toucher au schéma.

## 5. Authentification et permissions

- Mot de passe **haché bcrypt (coût 12)** ; jamais stocké en clair.
- Session : **JWT signé (jose, HS256)** dans un cookie `httpOnly` + `sameSite`,
  durée 7 jours. Secret dans `AUTH_SECRET`.
- Deux niveaux de contrôle :
  1. `src/middleware.js` (Edge) — barrière grossière par zone d'URL ;
  2. `requireAuth({ roles, permission })` dans chaque route API — contrôle fin.
- **Permissions extensibles** : table `Permission` + `RolePermission`. Le rôle ADMIN
  a implicitement tout ; le rôle COACH est déjà prévu — il suffira de lui associer des
  permissions en base pour ouvrir son espace, sans changer le code des routes.

## 6. Moteur de génération de programmes (point d'extension majeur)

Le moteur est un **registre de stratégies** (`modules/programs/generation/registry.js`) :

```js
registerGenerator(myGenerator)  // à l'initialisation du module
getGenerator(key)               // utilisé par program.service.js
listGenerators()                // alimente le formulaire admin dynamiquement
```

Chaque générateur déclare :

- `key`, `label` — identité ;
- `paramsSchema` — description de ses paramètres ; **le formulaire admin se construit
  tout seul** à partir de ce schéma (aucune modification d'UI pour un nouveau générateur) ;
- `generate(params, ctx)` — fonction pure qui reçoit les paramètres + le contexte
  (bibliothèque d'exercices, client) et retourne un plan `{ title, sessions[...] }`.

Les paramètres utilisés sont archivés en JSON sur le `Program` : on peut toujours
savoir *comment* un programme a été produit. Pour brancher la vraie logique de
génération plus tard : créer `generators/advanced.js`, l'enregistrer dans le registre —
c'est tout.

## 7. Conventions

- Pages serveur : récupèrent les données via les **services** (jamais via fetch interne),
  puis passent du JSON sérialisé aux composants client.
- Composants client : mutations via `fetch` vers les routes API uniquement.
- Toute erreur métier levée avec `ApiError(message, status)` → message sûr côté client ;
  toute autre erreur → 500 générique (pas de fuite d'information).
- Nommage : services en `<domaine>.service.js`, un domaine = un dossier de `modules/`.
