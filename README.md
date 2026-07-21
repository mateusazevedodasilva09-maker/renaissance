# Renaissance — gestion de l'activité de coaching

Application interne : formulaire public de prise de contact, CRM avec pipeline,
agenda, conversion prospect → client, espace client (séances de la semaine,
programme personnalisé, suivi de progression).

- **Architecture détaillée** → [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Mise en ligne pas à pas (non-développeur)** → [GUIDE-HEBERGEMENT.md](./GUIDE-HEBERGEMENT.md)

## Prérequis

- Node.js 18 ou plus récent
- Une base PostgreSQL (locale, ou hébergée : Neon, Supabase…)

## Démarrage en local

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer l'environnement
cp .env.example .env
#    → renseigner DATABASE_URL, AUTH_SECRET,
#      SEED_ADMIN_USERNAME / SEED_ADMIN_PASSWORD / SEED_ADMIN_EMAIL

# 3. Créer les tables puis injecter les données initiales
npm run db:migrate     # crée les tables (migration Prisma)
npm run db:seed        # statuts du pipeline, permissions, objectifs,
                       # types de séances, exercices, compte admin

# 4. Lancer
npm run dev            # http://localhost:3000
```

Connexion admin : les identifiants définis dans `.env` (`SEED_ADMIN_*`).

## Variables d'environnement

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Chaîne de connexion PostgreSQL |
| `AUTH_SECRET` | Secret de signature des sessions (longue chaîne aléatoire) |
| `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_EMAIL` | Compte admin créé par le seed |

Générer un secret : `openssl rand -base64 48` (ou n'importe quelle longue
chaîne aléatoire).

## Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | serveur de développement |
| `npm run build` / `npm start` | build puis serveur de production |
| `npm run db:migrate` | créer/appliquer une migration (développement) |
| `npm run db:deploy` | appliquer les migrations (production) |
| `npm run db:seed` | données initiales (réexécutable sans danger) |
| `npm run db:studio` | explorer la base dans le navigateur |

## Parcours type

1. Un prospect remplit le formulaire public **/rendez-vous** → il apparaît dans le
   CRM (statut « En réflexion ») et sa demande d'appel dans l'**Agenda** admin.
2. L'admin planifie l'appel, tient l'historique à jour dans la fiche prospect,
   fait glisser la carte dans le pipeline kanban.
3. Au passage en **Payé / Inscrit**, l'admin convertit le prospect : un compte
   client est créé (identifiants affichés une seule fois), l'historique CRM est
   conservé, les objectifs sont assignés.
4. Le client se connecte sur **/espace** : séances de la semaine filtrées selon
   ses objectifs, programme personnalisé, saisie et graphiques de progression.

## Notes

- `.next/` est un dossier de build généré automatiquement — il est ignoré par Git
  et peut être supprimé sans risque, il sera recréé au prochain build.
- Les statuts du pipeline, les thèmes de séances et le planning hebdomadaire se
  modifient directement dans l'interface (rien n'est codé en dur).
