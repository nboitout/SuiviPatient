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

```bash
npm install
npx prisma db push        # crée la base SQLite locale (prisma/dev.db)
npm run db:seed           # comptes de démo + 8 épisodes d'exemple
npm run dev
```

Comptes de démonstration (seed) :

- **Admin** : `admin@rop-institut.fr` / `demo1234`
- **Praticien** : `praticien@exemple.fr` / `demo1234`

Parcours de démo : connectez-vous comme praticien → « Créer un suivi » → ouvrez le lien
généré dans un onglet privé (vue patient, idéalement en mode mobile) → répondez au T0 →
revenez sur le tableau de bord praticien.

## Architecture

- **Next.js 16 (App Router) + React 19 + TypeScript** — même stack que le site ROP.
- **Prisma + SQLite** en développement/pilote ; passage à PostgreSQL (hébergement UE/EEE)
  en changeant `provider` et `DATABASE_URL` dans `prisma/schema.prisma`.
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

## Reste à faire avant le pilote (hors périmètre de ce dépôt)

- Envoi réel des rappels e-mail/SMS : les tâches sont créées en base (`ReminderTask`),
  il manque le dispatcher vers un prestataire conforme (Brevo, etc.) + cron.
- Validation juridique : mentions, texte de consentement, DPIA, contrat de sous-traitance,
  politique de rétention.
- MFA admin, politique de mot de passe renforcée, rate limiting.
- Hébergement UE (PostgreSQL chiffré, sauvegardes chiffrées, test de restauration).
