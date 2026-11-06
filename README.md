# SuiviPatient — webapp de suivi patient ROP

Application web V1 de recueil des résultats rapportés par les patients après séance ROP,
conforme aux spécifications fonctionnelles V1.0 (registre observationnel : suivi de
l'évolution ressentie, de la tolérance et des signaux de sécurité — **pas un outil de
diagnostic**).

## Les trois espaces

| Espace | URL | Description |
|---|---|---|
| **Patient** | `/s/[jeton]` | Sans installation ni compte : note d'information, consentement granulaire, questionnaires T0 / J2 / J21, messages de sécurité. Opt-out des rappels sur `/s/[jeton]/stop`. |
| **Praticien** | `/praticien` | Connexion, tableau de bord, création de suivi avec lien sécurisé + QR code, fiche épisode avec courbes d'évolution, boîte d'alertes avec workflow de qualification. |
| **Institut** | `/admin` | Gestion des praticiens, observatoire réseau agrégé (cellules < 5 masquées), export CSV agrégé journalisé, journal d'audit. |

## Démarrage rapide

Prérequis : Node.js ≥ 20 et une base PostgreSQL (gratuite sur [neon.tech](https://neon.tech)
— choisir une région UE — ou locale via Docker :
`docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=suivipatient postgres:16`).

```bash
npm install
cp .env.example .env      # puis renseigner DATABASE_URL
npm run db:migrate        # applique les migrations versionnées
npm run db:seed           # comptes de démo + 8 épisodes d'exemple
npm run dev
```

Comptes de démonstration (seed) :

- **Admin** : `admin@rop-institut.fr` / `demo1234`
- **Praticien** : `praticien@exemple.fr` / `demo1234`

Parcours de démo : connectez-vous comme praticien → « Créer un suivi » → ouvrez le lien
généré dans un onglet privé (vue patient, idéalement en mode mobile) → répondez au T0 →
revenez sur le tableau de bord praticien.

Pour inspecter les questionnaires sans compte ni dossier patient, utiliser le bouton
**Voir un aperçu du questionnaire patient** sur l’accueil, ou `/questionnaires/apercu`.
Cet aperçu propose les formulaires initial, à 48 h et à 3 semaines. Il utilise les mêmes
questions, conserve les réponses uniquement en mémoire et ne contacte jamais l’API de
soumission. Le suivi réel reste accessible uniquement par lien personnel ou QR code.

## Proposition de design à explorer

La page `/proposition`, liée depuis l’accueil, donne accès aux deux maquettes
interactives du nouveau design : parcours patient (accueil, bureau et mobile),
puis espace praticien (patients, dossier individuel et observatoire agrégé).
Les exemples sont entièrement fictifs et n’appellent aucune API patient.
Ces pages permettent de revoir la proposition ; elles ne remplacent pas les
parcours réels et ne modifient pas les droits d’accès.

- [Revue, règles de partage et plan de réalisation](docs/proposition-design-suivi-patient.md)
- [Sources et exports des maquettes](docs/maquettes/suivi-patient/README.md)

## Architecture technique

- **Next.js 16 (App Router) + React 19 + TypeScript** — même stack que le site ROP.
- **Prisma + PostgreSQL** (compatible Vercel/Neon ; choisir un hébergement UE/EEE).
- `lib/questionnaires.ts` — moteur de questionnaires : formulaires T0/J2/J21 définis en
  configuration (types de champs, logique conditionnelle, validation), versionnés.
- `lib/alerts.ts` — moteur d'alertes (section 7 des specs) : signes d'alerte initiaux,
  aggravation marquée, réaction > 72 h, besoin d'avis médical / soins urgents.
- `lib/episodes.ts` — cycle de vie des épisodes : jeton haute entropie (seul le hash
  SHA-256 est stocké), planification J2/J21, tâches de rappel.
- `lib/aggregate.ts` — métriques réseau agrégées avec règle de cellule minimale (n ≥ 5).

## Conformité RGPD intégrée (à valider par un DPO avant production)

- Consentement granulaire (traitement / rappels / recherche agrégée), versionné et horodaté ;
  aucune réponse de santé enregistrée sans consentement (contrôle serveur).
- Pseudonymisation : aucun nom de patient ; tranche d'âge au lieu de la date de naissance ;
  coordonnées de contact dans une table séparée des réponses.
- Cloisonnement strict : un praticien n'accède qu'à ses propres épisodes (contrôle serveur
  sur chaque page et action, tentatives refusées journalisées).
- Journal d'audit : connexions, consultations d'épisodes, exports, actions sur alertes.
- Rappels uniquement avec consentement explicite ; opt-out immédiat.
- Export réservé aux admins, agrégé par défaut, journalisé, cellules < 5 supprimées.
- En-têtes de sécurité (HSTS, X-Frame-Options, nosniff) ; sessions httpOnly 12 h ;
  mots de passe bcrypt.

## Déploiement sur Vercel

1. Sur [vercel.com](https://vercel.com) : **Add New → Project** → importer le dépôt
   GitHub `nboitout/SuiviPatient` (framework Next.js détecté automatiquement).
2. Créer la base : onglet **Storage → Create Database → Neon (Postgres)**, région
   **Frankfurt (eu-central-1)** ou Paris — la variable `DATABASE_URL` est ajoutée
   automatiquement au projet.
3. Ajouter la variable d'environnement `APP_BASE_URL` = l'URL publique du projet
   (ex. `https://suivipatient.vercel.app`) — elle sert à générer les liens patients.
4. Déployer, puis initialiser la base depuis votre machine :

   ```bash
   DATABASE_URL="<url de la base Neon>" npm run db:migrate
   DATABASE_URL="<url>" npm run create-admin -- admin@institut.fr "Institut ROP" "MotDePasseFort"
   ```

   (`npm run db:seed` charge les données de démonstration — à réserver à un
   environnement de test, pas à la production.)
5. Se connecter sur `/praticien/login` avec le compte admin et créer les comptes
   praticiens depuis `/admin/praticiens`.

## Reste à faire avant le pilote (hors périmètre de ce dépôt)

- Envoi réel des rappels e-mail/SMS : les tâches sont créées en base (`ReminderTask`),
  il manque le dispatcher vers un prestataire conforme (Brevo, etc.) + cron.
- Validation juridique : mentions, texte de consentement, DPIA, contrat de sous-traitance,
  politique de rétention.
- MFA admin, politique de mot de passe renforcée, rate limiting.
- Hébergement UE (PostgreSQL chiffré, sauvegardes chiffrées, test de restauration).


## Registre longitudinal (patients, épisodes et séances)

- `/praticien/patients` : retrouver un patient par son code pseudonyme stable.
- `/praticien/patient/[id]` : consulter tous ses épisodes, séances et questionnaires.
- `/praticien/nouveau` : créer un épisode pour un nouveau patient ou un patient existant, avec contexte initial et première séance structurée.
- `/praticien/episode/[id]/seance` : ajouter une séance au même épisode (zones ordonnées, côté, geste, intensité, durée, observations et adaptations).
- `/praticien/compte` : renseigner les versions du profil professionnel et les formations ; consulter l’historique de certification.
- `/admin/praticiens` : consulter les profils et gérer la certification avec historique.

Chaque séance conserve le profil applicable à sa date. Une modification ultérieure du profil ne modifie pas les séances enregistrées. Les coordonnées et les consentements restent rattachés à l’épisode.

**Base existante :** lire [la procédure de migration](docs/registre-longitudinal.md) avant déploiement. Ne pas utiliser `db:push` pour cette mise à niveau : la migration SQL conserve les anciennes séances et leurs liens patients.

### Démonstration locale sans Docker

1. Dans un terminal : `npm run db:local` (laisser tourner).
2. Configurer `.env` avec la connexion locale :

   ```dotenv
   DATABASE_URL="postgres://postgres:postgres@127.0.0.1:55431/template1?sslmode=disable&connection_limit=1&pgbouncer=true&statement_cache_size=0&connect_timeout=0&pool_timeout=0"
   APP_BASE_URL="http://localhost:3000"
   ```

3. Dans un second terminal : `npm run db:migrate`, puis `npm run db:seed` et `npm run dev -- --hostname 127.0.0.1`.
4. Utiliser les comptes de démonstration ci-dessus. Les données de démonstration comprennent six patients et huit épisodes.

Cette configuration utilise un serveur PostgreSQL local basé sur PGlite et uniquement des données fictives. Les paramètres de connexion spécifiques à ce serveur évitent les conflits de requêtes préparées ; ne pas les recopier automatiquement vers un hébergement distant.

### Vérification

```powershell
npm test
$env:REGISTRY_TEST_DATABASE_URL = 'postgres://postgres:postgres@127.0.0.1:55431/template1?sslmode=disable&connection_limit=1&pgbouncer=true&statement_cache_size=0&connect_timeout=0&pool_timeout=0'
npm run test:integration
npm run lint
npm run build
```

Les tests d’intégration exigent une connexion locale explicite, créent leur propre schéma temporaire et le suppriment en fin de test. Ils vérifient la migration de données V1, les liens longitudinaux, le cloisonnement, les transactions et la conservation des profils historiques.
