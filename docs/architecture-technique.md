# Architecture technique — SuiviPatient / registre PELVIS‑ROP

*Version 0.1 — document de travail — audience : développement.*

> Document **technique** complémentaire au protocole clinique (`protocole-pelvis-rop.md`). Le protocole décrit *ce que* l'on mesure et *pourquoi* ; ce document décrit *comment* l'application le recueille, le structure, l'analyse et le publie.

---

## 1. Socle existant (à conserver)

Monolithe **Next.js 16 (App Router) / React 19 / TypeScript**, **Prisma 6** sur **PostgreSQL** (Neon, région UE), authentification maison (bcrypt + sessions hachées en cookie httpOnly). Trois espaces : `/s/[token]` (patient, sans compte), `/praticien` (portail), `/admin` (institut).

Éléments porteurs de la conformité RGPD **à préserver** : pseudonymisation (pas de nom ; `ageBand`/`sex`), table `PatientContact` séparée des réponses, consentements gradués et versionnés, cloisonnement par praticien, journal d'audit, moteur d'alertes de sécurité, lien patient tokenisé sans compte.

## 2. Additions au modèle de données (Prisma)

Couche de codage scientifique à ajouter au‑dessus de `User` / `Episode` / `FormTask` / `Alert` / `AuditLog`.

### 2.1 Atlas des zones réflexes (référentiel central, versionné)
- **`AtlasVersion`** — rattache une version d'atlas à une édition du livre / révision du gradient.
- **`ReflexZone`** — `site` (occipital | podal), descripteurs anatomiques (terminologie du livre : dorsal/ventral, médial/latéral, céphalique/caudal ; avant‑pied/arche/talon/tunnel tarsien), `bonyLandmark`, `nerveTerritory` (enum : `TIBIAL`, `MEDIAL_PLANTAR`, `LATERAL_PLANTAR`, `CALCANEAL`, `SURAL`, `SUP_FIBULAR`, `DEEP_FIBULAR`, `SAPHENOUS`), `radicularEstimate`, `targetRegion`, `gradientLevel` (0–3), `zoneRole` (`TARGET` | `CONTROL`), `syndromeScope` (`GENERAL` | `LOCO_REGIONAL`), `atlasVersionId`.

Référentiel **possédé par l'institut** (console admin existante) et **versionné** : le gradient est « provisoire, destiné à évoluer ». Tout le monde code contre la même référence — condition *sine qua non* de la comparabilité.

Liste contrôlée des `targetRegion` pelviennes (§9 du chapitre) : `LOWER_URINARY_TRACT`, `DISTAL_COLON_RECTUM`, `PELVIC_FLOOR_SPHINCTERS`, `LOWER_GENITAL_TRACT`, `PERINEAL`. Hors pelvis : `UPPER_GI`, `CARDIOPULMONARY`, etc.

### 2.2 Séance de traitement (normalisée hors de `Episode`)
Aujourd'hui `sessionNumber`/`sessionDate` sont portés par `Episode` (une séance implicite). À normaliser :
- **`TreatmentSession`** — `episodeId`, `sessionIndex`, `date`, `practitionerId`, `gestureParameters` (JSON : profondeur, durée, vitesse, surface de contact, direction), `palpationFindings`.
- **`SessionZoneTreatment`** — jointure `TreatmentSession` ↔ `ReflexZone` : zone stimulée, `intendedRegion`, `gradientLevelRelied`.

### 2.3 Contexte / covariables sur `Episode`
`targetRegion`(s), indication primaire codée, `designType` (`ROUTINE` | `N_OF_1` | `CONTROL_ZONE`), `studyProtocolVersion`, et covariables de base : ancienneté du trouble, drapeaux imagerie/chirurgie antérieures, **traitements/médicaments concomitants**, comorbidités fonctionnelles.

### 2.4 Instruments de mesure validés (versionnés)
- **`OutcomeInstrument`** — `code` (ex. `ICIQ_UI_SF`), `region`, définition des items, règle de score, `version`.
- **`InstrumentResponse`** — réponses item par item + score calculé + `version`, rattachées à un `FormTask` (timepoint T0/J2/J7/J30/J90).

### 2.5 Capture vocale
- **`VoiceCapture`** — `episodeId`/`sessionId`, `speakerRole` (`PRACTITIONER` | `PATIENT`), `capturedAt`, `audioRef`, `transcriptRef`, `asrConfidence`, `reviewStatus` (`MACHINE` | `HUMAN_VERIFIED`).
- **`ExtractedObservation`** — lie un segment de transcription à un code d'atlas ou un item d'instrument, avec `confidence` et `verifiedBy`.

### 2.6 Réutilisation
`Alert` conservé comme **registre d'événements indésirables / sécurité** (ajouter une classification de gravité EI). `ConsentRecord` étendu d'un type `VOICE_RECORDING`.

## 3. Pipeline vocal

Nouveau cœur fonctionnel. Tout hébergé en UE, RGPD.

**Capture**
- Praticien peropératoire, mains libres : l'app propose un gabarit oral léger (« zone, nerf, profondeur, durée, réaction tissulaire, ressenti patient ») mais accepte la narration libre.
- Patient : note vocale en fin de séance (en cabinet) et notes asynchrones les jours suivants via le lien tokenisé (sans compte), en mots libres + quelques échelles répondues oralement.

**Traitement**
1. **ASR** français, orienté médical, **biaisé par le lexique de l'atlas** (termes de zones/nerfs : « calcanéen », « plantaire médial », « S2‑S3 ») pour la reconnaissance.
2. **Diarisation** (séparation praticien/patient) quand ils partagent la pièce.
3. **Extraction structurée (LLM)** : narration libre → codes d'atlas et items d'instruments — remplit `SessionZoneTreatment`, `gestureParameters`, `palpationFindings`, `InstrumentResponse`, `ExtractedObservation`. C'est le pont non‑structuré → structuré.
4. **NLP de sécurité** : détection de formulations « drapeau rouge » dans l'audio patient → routage direct vers le moteur `Alert`.
5. **Validation humaine dans la boucle** : le praticien relit et corrige la fiche structurée avant enregistrement (`reviewStatus = HUMAN_VERIFIED`). **Seuls les enregistrements vérifiés alimentent l'analyse.**

**Stockage en tiers séparés, rétentions distinctes**
Audio brut (rétention courte, chiffré, effaçable séparément) → transcription (rédaction/anonymisation PII par NER avant de quitter la couche de soin) → codes structurés → enregistrement de recherche dé‑identifié. Le **droit à l'effacement doit atteindre l'audio**. Symétrique de la séparation `PatientContact` / réponses déjà en place.

> Risque d'ingénierie principal : l'ASR en cabinet réel (bruit ambiant, deux locuteurs, vocabulaire anatomique français). Mitigations obligatoires : lexique biaisé par l'atlas + **validation humaine systématique**. Ne jamais laisser l'extraction brute atteindre le jeu de données.

## 4. Analyse automatisée

`lib/aggregate.ts` évolue en tâche d'analyse planifiée. Systématiquement **ampleurs d'effet + intervalles de confiance** (pas seulement des p‑values) :
- Critère principal : taux de répondeurs (≥ MCID) + variation moyenne, apparié, avec IC.
- Spécificité : contraste cible vs hors‑cible.
- Dose‑réponse : **modèle mixte** (mesures répétées, **praticien en effet aléatoire** pour gérer le clustering par opérateur).
- Sous‑groupes pré‑spécifiés et limités (sous‑système pelvien, territoire nerveux tibial vs contrôle, `ageBand`, `sex`) — étiquetés exploratoires.
- Attrition & complétude, avec analyse de sensibilité sur données manquantes.
- Sécurité : tabulation des EI depuis le flux d'alertes.
- NLP exploratoire : thèmes récurrents des narrations patient — toujours étiquetés générateurs d'hypothèses, curés humainement avant tout affichage public.

## 5. Verrou de significativité et page publique

**Porte pré‑enregistrée, non discrétionnaire :**
- **Taille cible N\*** fixée d'avance, calculée pour le critère principal (taux de répondeurs attendu, MCID, alpha, puissance). La page affiche « recrutement : X / N\* » jusqu'à N\*, puis **verrouille et publie l'analyse pré‑spécifiée**. Cela neutralise l'arrêt opportuniste.
- Si des analyses intermédiaires sont voulues : plan séquentiel de groupe avec dépense d'alpha (O'Brien‑Fleming).

**Page publique** — route `/observatoire/pelvien`, **lecture seule, publique**, réutilisant `lib/aggregate.ts` avec le masquage n ≥ 5 déjà en place, rendu ISR/statique, **aucune donnée au niveau patient** :
- protocole pré‑enregistré, N, taux de répondeurs et ampleurs d'effet avec IC, résultat de spécificité, sécurité ;
- formulation honnête (« registre observationnel ; associations, pas preuve d'efficacité ») ;
- horodatée, versionnée, « dernière mise à jour » ; énoncé explicite de ce qui compterait comme résultat négatif, affiché que le résultat soit positif ou nul ;
- vivante mais l'**affirmation principale est gelée** au verrou pré‑enregistré.

Accès depuis le livre via QR code → URL courte → cette route.

## 6. Sécurité & RGPD (rappel des invariants)

Pseudonymisation ; audio stocké séparément et chiffré, effaçable individuellement ; effacement atteignant l'audio ; consentements versionnés (dont `VOICE_RECORDING`) ; audit exhaustif ; hébergement UE (Neon Francfort/Paris) ; masquage petits effectifs sur toute sortie agrégée.

## 7. Ce qui est à construire (net‑new)

- Fournisseur **ASR** UE + diarisation ; couche d'extraction LLM + interface de **validation praticien**.
- Stockage audio tiéré + politique de rétention + effacement.
- **Dispatch des rappels** (`ReminderTask` crée déjà les lignes ; l'envoi email/SMS — ex. Brevo — et le cron ne sont pas implémentés).
- Bibliothèque d'**instruments validés** + moteur de score.
- Tâche d'analyse planifiée + **mécanisme de verrou** N\* / pré‑enregistrement.
- Route publique `/observatoire/pelvien` (ISR).
- Référentiel **atlas** versionné + écrans admin de gestion.

## 8. Séquencement de build

1. Atlas versionné + `TreatmentSession`/`SessionZoneTreatment` + covariables `Episode`.
2. Instruments validés + `InstrumentResponse` ; calendrier T0/J2/J7/J30.
3. Pipeline vocal (capture → ASR → extraction → validation) sur la cohorte pelvienne.
4. Consentement voix + stockage/rétention audio + effacement.
5. Tâche d'analyse + verrou N\* + page publique.
6. Dispatch des rappels.
