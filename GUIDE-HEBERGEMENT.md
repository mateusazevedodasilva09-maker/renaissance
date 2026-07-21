# Mettre Renaissance en ligne — guide pas à pas

Ce guide est écrit pour quelqu'un qui **n'est pas développeur**. Il explique comment
rendre l'application accessible sur internet, avec une vraie base de données et,
si vous le souhaitez, votre propre nom de domaine (ex. `app.renaissance-coaching.fr`).

**La solution recommandée** (la plus simple et gratuite pour démarrer) :

- **Vercel** héberge l'application (c'est l'entreprise qui crée Next.js, la
  technologie de l'app — la compatibilité est parfaite).
- **Neon** héberge la base de données PostgreSQL.

Comptez **30 à 45 minutes** la première fois. Aucune carte bancaire n'est
nécessaire pour les offres gratuites, qui suffisent largement pour démarrer.

---

## Vue d'ensemble

```
Vos clients / prospects
        │
        ▼
  votre-domaine.fr  ──►  Vercel (l'application)  ──►  Neon (la base de données)
```

Il y a 5 étapes : ① mettre le code sur GitHub, ② créer la base sur Neon,
③ déployer sur Vercel, ④ initialiser la base, ⑤ (optionnel) brancher votre domaine.

---

## Étape 1 — Mettre le code sur GitHub

GitHub est un coffre-fort en ligne pour le code. Vercel s'y branchera pour
déployer automatiquement.

1. Créez un compte gratuit sur **github.com**.
2. Cliquez sur **New repository**, nommez-le `renaissance`, choisissez
   **Private** (privé), puis **Create repository**.
3. Sur votre ordinateur, ouvrez le Terminal dans le dossier `renaissance`
   du projet et tapez, ligne par ligne :

```bash
git init
git add .
git commit -m "Première version"
git branch -M main
git remote add origin https://github.com/VOTRE-PSEUDO/renaissance.git
git push -u origin main
```

(Remplacez `VOTRE-PSEUDO` par votre pseudo GitHub. Si `git` demande de vous
identifier, suivez ses instructions à l'écran.)

> Important : le fichier `.env` (qui contient vos mots de passe) n'est **pas**
> envoyé sur GitHub — c'est voulu et déjà configuré.

## Étape 2 — Créer la base de données sur Neon

1. Créez un compte gratuit sur **neon.tech** (connexion possible avec GitHub).
2. Créez un projet, nommez-le `renaissance`, choisissez une région en Europe
   (ex. Frankfurt) pour de meilleures performances depuis la France.
3. Sur le tableau de bord, repérez la **Connection string** : une longue adresse
   qui commence par `postgresql://...`. Copiez-la et gardez-la de côté — c'est
   la « clé » de votre base, à ne partager avec personne.

## Étape 3 — Déployer l'application sur Vercel

1. Créez un compte gratuit sur **vercel.com** en choisissant
   **Continue with GitHub**.
2. Cliquez sur **Add New… → Project**, et importez le dépôt `renaissance`.
3. Avant de cliquer sur Deploy, ouvrez la section **Environment Variables**
   et ajoutez ces 5 variables (nom → valeur) :

| Nom | Valeur |
|---|---|
| `DATABASE_URL` | la Connection string copiée sur Neon |
| `AUTH_SECRET` | une longue phrase aléatoire (60+ caractères) que vous inventez et gardez secrète |
| `SEED_ADMIN_USERNAME` | votre identifiant admin (ex. `mateus`) |
| `SEED_ADMIN_PASSWORD` | votre mot de passe admin (8 caractères minimum, choisissez-le fort) |
| `SEED_ADMIN_EMAIL` | votre e-mail |

4. Cliquez sur **Deploy**. Après 1 à 2 minutes, Vercel affiche « Congratulations »
   et une adresse du type `renaissance-xxxx.vercel.app`.

> À ce stade le site est en ligne mais la base est encore vide — c'est normal,
> la connexion affichera une erreur. L'étape 4 corrige cela.

## Étape 4 — Initialiser la base de données

Cette étape crée les tables et les données de départ (statuts du pipeline,
types de séances, exercices, **votre compte admin**). Elle se fait une seule
fois, depuis votre ordinateur, dans le Terminal ouvert dans le dossier du projet :

```bash
# 1. Dire au projet d'utiliser la base Neon :
#    ouvrez le fichier .env et remplacez la ligne DATABASE_URL
#    par la Connection string de Neon. Renseignez aussi AUTH_SECRET
#    et les 3 variables SEED_ADMIN_* (les mêmes que sur Vercel).

# 2. Créer les tables
npm run db:deploy

# 3. Injecter les données initiales + créer votre compte admin
npm run db:seed
```

Quand le terminal affiche que le seed est terminé, retournez sur l'adresse
`...vercel.app` : vous pouvez vous connecter avec vos identifiants admin. 🎉

## Étape 5 (optionnel) — Votre nom de domaine

1. Achetez un domaine (~10 €/an) chez un registrar : OVH, Gandi, Namecheap…
2. Dans Vercel : votre projet → **Settings → Domains** → **Add**, tapez votre
   domaine (ex. `app.renaissance-coaching.fr`).
3. Vercel affiche une instruction du type « ajoutez un enregistrement CNAME » :
   recopiez-la telle quelle dans l'interface de gestion DNS de votre registrar
   (rubrique « Zone DNS »).
4. Attendez de quelques minutes à quelques heures : le site répond alors sur
   votre domaine, **avec le cadenas HTTPS automatique** (rien à faire).

---

## La vie de l'application ensuite

**Mettre à jour l'app** : chaque fois que du nouveau code est envoyé sur GitHub
(`git push`), Vercel redéploie automatiquement en ~2 minutes. Rien d'autre à faire.

**Si une mise à jour modifie la base de données** (nouvelles tables/colonnes),
il faudra relancer `npm run db:deploy` depuis votre ordinateur — la personne qui
vous fournit la mise à jour vous le précisera.

**Sauvegardes** : Neon conserve un historique de votre base (restauration
possible à un instant donné). Pensez aussi à noter précieusement quelque part
de sûr : la Connection string Neon, votre `AUTH_SECRET`, et vos identifiants
Vercel/GitHub/Neon.

**Coûts** : 0 € pour démarrer (offres gratuites Vercel + Neon), suffisant pour
des dizaines de clients. Si l'activité grossit : Vercel Pro ~20 $/mois et/ou
Neon payant selon l'usage — vous serez prévenu avant toute limite.

## En cas de problème

- **« Erreur interne » ou page blanche après le déploiement** → vérifiez que les
  5 variables d'environnement sont bien renseignées sur Vercel (Settings →
  Environment Variables), puis relancez un déploiement (Deployments → ⋯ → Redeploy).
- **Connexion impossible avec vos identifiants admin** → l'étape 4 (seed) n'a
  probablement pas été faite, ou avec d'autres valeurs `SEED_ADMIN_*` que celles
  que vous essayez.
- **Le formulaire public ne crée pas de prospect** → presque toujours un problème
  de `DATABASE_URL` (vérifiez qu'elle est identique sur Vercel et dans votre `.env`).

## Alternative : serveur privé (VPS)

Il est aussi possible d'héberger sur un VPS (OVH, Scaleway, ~5 €/mois) : vous y
installez Node.js et PostgreSQL, lancez `npm run build` puis `npm start`, et
placez un reverse-proxy (Caddy ou Nginx) devant pour le HTTPS. C'est plus de
liberté, mais aussi **plus de responsabilité** (mises à jour de sécurité,
sauvegardes, pannes à gérer soi-même). Pour démarrer sereinement, la voie
Vercel + Neon ci-dessus est recommandée.
