# Registre longitudinal — évolution du modèle V1

## Parcours livré

Le praticien renseigne son profil professionnel dans **Mon compte**, puis crée un épisode en sélectionnant un patient existant ou en générant un nouveau code. L’épisode conserve le contexte initial et la première séance. Les séances suivantes s’ajoutent depuis la fiche épisode. L’écran **Patients** regroupe l’historique de chaque code.

Les zones sont saisies dans l’ordre réel de traitement : site podal ou occipital, repère descriptif, côté, technique, intensité, durée facultative, observations avant/après. La référence de cartographie est déclarative ; cette version n’introduit pas de correspondance anatomique validée ni de classification d’efficacité.

Les questionnaires restent des mesures au niveau de l’épisode. Ajouter une séance ne recrée pas T0 et ne modifie pas le calendrier existant. Les observations consignées par le praticien sont affichées séparément des réponses directes du patient.

## Structure et provenance

- `Patient` : code stable, propriétaire praticien, tranche d’âge/sexe facultatifs ; aucun nom. Le praticien conserve localement la correspondance avec l’identité.
- `Episode` : problème suivi, contexte initial et accord de recueil attesté par le praticien ; plusieurs séances et questionnaires. `startedAt` utilise la colonne historique `sessionDate`.
- `TreatmentSession` / `SessionZoneTreatment` : séance datée, version du protocole/cartographie, gestes ordonnés et contexte. Le numéro est unique au sein de l’épisode.
- `PractitionerProfileVersion` : versions ajoutées sans écrasement, date d’effet déclarée, profession, cadre d’exercice, année de début, volume indicatif, autres pratiques et formations datées.
- `CertificationEvent` : historique du statut géré par l’institut, auteur et date d’enregistrement.
- `practitionerSnapshot` : copie des qualifications applicables à la date de séance, avec seules les formations déjà obtenues à cette date. Les identifiants des versions sources sont également conservés. Un statut de certification historique inconnu reste inconnu.

Les écritures de patient, épisode, séance et journal sont transactionnelles. Les clés étrangères composites empêchent de rattacher un épisode, une séance ou un profil à un autre praticien, même en contournant les contrôles applicatifs. Les consultations de l’historique patient sont journalisées.

Les changements de profil ne recalculent jamais les anciens snapshots. Le profil applicable est celui dont la date d’effet est la plus récente sans dépasser la date de séance ; en cas d’égalité, la version enregistrée le plus récemment est utilisée. Les dates de séance et d’effet sont des dates civiles, stockées en `DATE` et affichées en UTC pour éviter un changement de jour selon le serveur.

La tranche d’âge et le sexe sont préremplis pour un patient déjà connu et peuvent être actualisés au début d’un nouvel épisode. Les valeurs enregistrées sur les épisodes antérieurs restent inchangées.

## Migration d’une base existante

Les anciens déploiements utilisaient `prisma db push` et n’ont donc pas nécessairement d’historique Prisma Migrate. Les deux migrations ajoutées sont :

1. `20261105000000_baseline` : schéma V1 précédent, destiné aux bases neuves ou au marquage initial d’une base V1 existante.
2. `20261105010000_longitudinal_registry` : extension et reprise des données, dans une transaction PostgreSQL.

Avant la mise à niveau d’une base existante, sauvegarder et vérifier la restauration sur une copie. Vérifier que son schéma correspond au baseline V1 ; résoudre les éventuelles différences avant de le marquer comme appliqué. Sur cette copie, puis sur la base choisie pour le déploiement :

```sh
npx prisma migrate resolve --applied 20261105000000_baseline
npm run db:migrate
npx prisma generate
```

Sur une base neuve, exécuter seulement `npm run db:migrate`, puis `npx prisma generate`. Réserver `npm run db:seed` aux démonstrations.

La migration :

- crée un patient distinct pour chaque ancien épisode, sans rapprochement automatique par e-mail ou téléphone ;
- transforme l’ancienne séance implicite en `TreatmentSession`, en conservant son numéro et sa date avant de retirer `Episode.sessionNumber` ;
- conserve les identifiants d’épisodes, hashes de liens, contacts, consentements, réponses, tâches et alertes ;
- laisse inconnus les gestes et profils historiques non documentés ;
- initialise l’historique de certification au statut constaté à la migration, sans le projeter dans le passé.

Le praticien peut ensuite **rattacher un épisode à un autre dossier patient** après vérification explicite. Cette opération conserve les séances, réponses, coordonnées et consentements de l’épisode et journalise les anciens/nouveaux identifiants. Les dossiers devenus vides sont conservés, mais exclus de la liste courante et du compteur de patients.

## Périmètre des vérifications

Les tests couvrent la validation, les dates, les données historiques, l’isolation entre praticiens, les créations transactionnelles, les doublons de numéro de séance et les profils versionnés. La procédure de test locale figure dans le README.

Les sujets du précédent audit — consentement des agrégats, fenêtres de suivi, rappels, instruments validés, durcissement de l’authentification et mises à jour de dépendances — restent des chantiers distincts. Cette livraison ne constitue pas une validation de mise en production clinique.
