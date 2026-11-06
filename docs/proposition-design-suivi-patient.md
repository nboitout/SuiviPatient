# Suivi Patient — design and workflow proposal

6 November 2026 · Proposal for discussion · Interactive demonstration pages only

The patient and practitioner sketches are published at `/proposition` for review.
They use fictional examples and do not modify real patient workflows or access.

**Recommendation:** evolve Suivi Patient into a calm, guided follow-up companion. Borrow the reference’s clear hierarchy, generous spacing and visible journey; retain ROP’s sage identity, patient-reported measures and longitudinal follow-up.

## Review basis

- Visually inspected the [Social Innovation questionnaire](https://social-inno-questionnaire.vercel.app/), including its introduction and participant-entry screen. Its deeper questionnaire was not submitted or completed.
- Visually inspected the [current Suivi Patient preview](https://suivi-patient-eight.vercel.app/questionnaires/apercu).
- Reviewed local implementation at commit `29f4a78`: `components/PatientFlow.tsx`, `lib/questionnaires.ts`, `lib/alerts.ts`, `app/globals.css`, the patient and preview routes, and the project README.
- The proposal uses the implemented T0 / D2 / D21 schedule. The separate PELVIS-ROP draft describes a different future research schedule; this redesign does not substitute that protocol.

## What the current interface gets right

The useful foundation is already present: personal links and QR codes without a patient account, separate consent choices, versioned questionnaire definitions, conditional fields, numeric scales, exclusive “none” options, server validation, and practitioner-facing alerts. Patient answers belong to an episode within a longitudinal registry. These are product requirements to carry forward.

The current palette also has a recognizable ROP identity. Sage, warm neutrals and a small serif accent can feel human and credible without resembling a generic medical dashboard.

## Where the experience loses momentum

| Observation | Proposed response |
|---|---|
| All visible questions appear as one long series of similarly styled cards. | Introduce short, named chapters, with one dominant question area and clear next/back actions. |
| The desktop patient layout is constrained to a 640 px container. | Use a wider shell: a quiet journey rail and a readable content column, while keeping text lines controlled. |
| Thin serif headings, small uppercase buttons and repeated borders compete with practical form use. | Use stronger sans-serif interface headings, sentence-case buttons, less card chrome, and reserve serif for the welcome’s editorial accent. |
| Progress counts optional fields as part of the total. A valid submission can therefore look incomplete. | Show chapter position and completion of required answers. Optional omissions remain legitimate; submission success is a separate state. |
| Missing answers are surfaced on final submission. | Validate each chapter on Continue, explain errors beside the relevant question, and preserve all answers. |
| There is no review step before sending. | Add an editable summary, then one explicit send action and a server-confirmed receipt. |
| Patient safety messages returned by the server appear after submission. | Propose contextual guidance before final submission as well, using centrally maintained, reviewed rules and wording. Keep server evaluation authoritative. |

These are design observations, not measured evidence of abandonment or improved completion rates. Measure outcomes in a pilot before making performance claims.

## Visual direction: “Votre ressenti, au fil des jours”

Keep the Institut R.O.P. signature and sage family. Use a near-white warm background, dark forest text and buttons, pale sage for active selections, and restrained terracotta for attention messages. A selected answer should be clearly selected without implying that it is medically good or bad.

Use 16–18 px body text in production, substantial headings, 12–16 px control corners, and 44–48 px touch targets. Provide clear keyboard focus, native radio and checkbox semantics, screen-reader names, and inline error associations. Support text enlargement and reduced motion. Contrast and assistive-technology behavior require implementation-stage testing.

Use short, respectful French copy. Participation should feel manageable and worthwhile. Avoid streaks, scores for participation, confetti, smiling/sad faces on outcome scales, or wording that assumes improvement. Do not display previous answers while collecting a new rating; that could anchor the response.

## The proposed workflow

**Personal link → welcome → information and consent when needed → short chapters → review → send → receipt and next appointment in the follow-up.**

The personal link opens the appropriate available questionnaire. Returning patients should not repeat onboarding or consent unnecessarily. Public visitors can still explore an unmistakably separate preview.

### Initial questionnaire

| Chapter | Existing content retained |
|---|---|
| Votre situation | Main reason and symptom duration |
| Votre ressenti | Symptom intensity and limitation in daily activities |
| Votre quotidien | Sleep, energy, stress; conditional digestive comfort |
| Votre sécurité | Medical follow-up and the existing safety-sign checklist |
| Relire et envoyer | Optional comment, editable answer summary, explicit submission |

On desktop, show two or three related questions per chapter where comfortable. On mobile, use one question or a small closely related group per screen. Avoid adding celebratory interstitial screens between every question.

### Follow-up at 48 hours

Use a shorter sequence: seven-point symptom change → reactions → conditional reaction intensity → reaction duration → medical advice/urgent care → optional comment → review. Preserve all seven change labels and the exact numeric scale anchors. “Aucune réaction” remains exclusive. Optional questions offer a clear way to continue without answering.

### Follow-up at three weeks

Use the same shell with content grouped into overall change, current symptoms and daily experience, duration of perceived benefit, then optional continuation preference/comment and review. Preserve current answer values and scale direction. Questionnaire wording and branching changes require their own versioned review.

### Confirmation and return visits

Only say “Vos réponses sont enregistrées” after server confirmation. Explain that the practitioner can consult them, show the next available follow-up and the same-link return path, and avoid promising immediate review. For a future or completed questionnaire, show a useful next-step page. For an invalid or expired link, give a clear route back to the practitioner.

On connection failure, retain the current answers and offer retry. Do not copy the reference’s browser-storage promise wholesale: persistent drafts contain health-related data. A resume capability needs a deliberate design for consent, access, retention and shared-device behavior. In the first visual release, promise only what the actual implementation supports.

## Desktop and mobile behavior

**Desktop:** keep the journey visible on the left and the current chapter on the right. Use keyboard-friendly answer controls and an unambiguous Continue action. Let users return to completed chapters without losing data. Separate the three follow-up timepoints from progress within today’s questionnaire.

**Mobile:** keep the timepoint and compact progress at the top, with large full-width choices and a bottom action area. In production, the action area can be sticky when it does not obscure content or the software keyboard; the inline sketch uses normal document flow. Present 0–10 as explicitly labeled choices with no default selection, arranged in two rows when a single row would make targets too narrow. Preserve all eleven values and both endpoint labels.

Start with one responsive web application. Patient access is occasional and already works through a personal link, so an app download should not become a prerequisite. Evaluate installability later if repeat-use research supports it. Native applications, offline health-data storage, push notifications and desktop packaging are separate decisions, not dependencies for this redesign.

The practitioner portal is a core part of this redesign. Each practitioner must have a personal workspace for their assigned patients and access to the shared aggregate observatory. It inherits the patient-facing typography and controls while serving a different workflow: patients → episodes → sessions → responses and alerts. The patient’s one-question flow should not replace the practitioner’s broader overview.

## Core requirement added: practitioner access and shared statistics

The user explicitly requires individual patient data to be accessible to the related practitioner, each in their own section, together with access to aggregated and anonymized statistics. The design therefore covers three connected spaces: the patient questionnaire, a private practitioner workspace, and an aggregate network observatory.

### Who can see what

| Actor | Individual patient information | Statistics |
|---|---|---|
| Patient using their personal link | Their authorized follow-up and responses/receipt as supported by the patient flow | No network access by default |
| Signed-in practitioner | Only their assigned patients, episodes, sessions, questionnaire answers, authorized contact details, consent status and alerts | Their own practice summaries and the released aggregate network statistics |
| Another practitioner | No access to the first practitioner’s individual dossiers | The same approved network summaries |
| Institut administrator | Account, certification and system administration; no new blanket patient-access permission introduced by this proposal | Network statistics and permitted aggregate exports |

**“Mes patients”** is the practitioner’s default landing area: search by stable patient code, filter follow-up status, identify new answers and overdue questionnaires, then open a longitudinal dossier. A dossier brings together its episodes, treatment sessions, exact patient responses, changes over time and alert handling. Names are not currently collected by the application; the practitioner connects the stable code with their existing local patient record. Adding identifiable names would be a separate data-model and purpose decision.

**“Observatoire ROP”** is a separate navigation item available to authorized practitioners. It exposes released statistics, not underlying network patient rows. Use clear cohort labels, broad periods and vetted indication groups. Do not provide a drill-down from network statistics to another practitioner’s patients, individual practitioners’ rankings, free-text responses or raw record downloads.

On a phone, “Mes patients” becomes a stacked list and dossier timeline; the observatory keeps the same cohort definition with vertically stacked results. On desktop, the patient list and clear navigation remain visible within a wider application shell.

### How an answer reaches the correct practitioner

1. A practitioner creates the patient/episode under their authenticated account. The existing personal link is bound to that episode.
2. The patient submits through that link. The server resolves the episode and its practitioner; the patient does not choose a recipient from a public list.
3. After validation and successful storage, the response is available in that practitioner’s private workspace and the questionnaire status updates. New-response indicators are derived from actual received answers.
4. If the episode is eligible for collective use, its permitted data can contribute to the next aggregate release. Follow-up permission and the optional collective-use choice remain separate.

The current schema assigns one practitioner to a patient record. If shared care or transfers become necessary, introduce explicit, audited access grants and a defined transfer process. Do not expose a dossier to another practitioner merely because the same code or similar details appear elsewhere.

### Enforce the boundary in the server

Derive practitioner identity from the authenticated session, never a browser-supplied practitioner ID. Check ownership and authorization for every patient, episode, session, response, alert, action and permitted export. Apply the same scope to searches, pagination, counts and cached responses. A hidden menu item is not an access control.

Preserve audit records for consultations and changes. Validate behavior with two practitioner accounts: practitioner B must not read or change A’s records even by copying an ID, URL or request. Test revoked sessions and the intended account-status policy as well as ordinary login.

### Make the shared output genuinely suitable for anonymized publication

Replacing names with codes is pseudonymization. Effective anonymization also requires addressing identification through linkage, isolation of a person and inference; it is not established by deleting names alone. See [CNIL’s anonymization guidance](https://www.cnil.fr/fr/technologies/lanonymisation-de-donnees-personnelles).

Proposed release policy:

- Respect the application’s declared collective-use permission, including its current effective state and withdrawal. The existing optional `AGGREGATED_RESEARCH` choice must not be ignored. Exclude ineligible records before computing collective metrics. Rebuild future releases when eligibility changes; do not promise that already published anonymous statistics can be traced back to an individual and selectively removed.
- Produce aggregate output on the server and send only releasable values to the browser. Remove patient codes, episode identifiers, contact details, exact individual dates and free-text comments from that output.
- Base disclosure protection on independent contributors, not a count of repeated episodes or sessions. Five episodes from one person are not five independent people. The current practitioner-specific patient codes do not establish unique individuals across the whole network; use a conservative contribution policy and resolve this limitation without introducing unnecessary identity matching.
- Suppress unsafe small cohorts, rare event counts and small complements. Apply rules consistently to numerators, denominators, totals, derived rates, trends and any allowed export. A large denominator can still expose a rare outcome.
- Prevent reconstruction by subtracting published totals, switching adjacent filters or comparing releases. Consider a practitioner’s knowledge of their own patients when evaluating network-minus-own-practice comparisons. Use restricted cohort definitions and fixed publication periods; add complementary suppression or coarsening where required.
- Document and review the release method before labeling production output “anonymized.” The existing minimum of five episodes is an implementation detail, not proof that the output is anonymous.

### Useful statistics and explicit denominators

| Statistic | Definition to display |
|---|---|
| Participation | Patient records, episodes and sessions shown as different units; no implied network-wide person deduplication |
| Completion | Received responses divided by eligible questionnaires whose due date has been reached; canceled/revoked or not-yet-due tasks handled explicitly |
| Three-week reported change | Distribution of the seven response categories; if a headline combines “mieux” and “beaucoup mieux,” label that exact definition and the responding population |
| Symptom evolution | Paired T0 and three-week responses from the same episode, with the number of pairs and the direction of subtraction stated |
| Reactions | Valid 48-hour responses reporting reactions, with an explicit eligible denominator; resolve the existing 72-hour ambiguity before presenting a persistence measure |

Show missing follow-up and cohort selection so favorable results are not mistaken for the experience of every enrolled patient. These are observational patient-reported results, not a causal efficacy claim.

### What exists and what still needs implementation

Code review on 6 November 2026 confirms that patient lists and histories are scoped to the signed-in practitioner; episode detail also checks its owning practitioner. The current administrator area has aggregate calculations and an admin-only CSV endpoint. This was a source review, not a production penetration test.

The required additions are a redesigned practitioner workspace and a practitioner-accessible, privacy-reviewed aggregate endpoint/view. Do not simply expose the current admin endpoint or copy its permissions. The reviewed aggregation function currently reads all questionnaire responses without filtering collective-use consent, thresholds selected outputs using episode/response counts, and returns unsuppressed overall counts. Those gaps must be addressed before extending its audience or describing its output as anonymized.

A separate interactive practitioner sketch illustrates “Mes patients,” a patient dossier and “Observatoire ROP.” All patient codes, dates and statistics in it are invented. Its small-cohort state intentionally contains no hidden underlying cohort values. It demonstrates the access model visually; it does not implement production authentication or anonymity guarantees.

## Content and logic decisions to resolve separately

1. **48 hours versus 72 hours.** The 48-hour questionnaire asks whether a reaction lasted more than 72 hours. Its duration question is required even if “Aucune réaction” is selected. In addition, `en_cours` currently creates an alert described as persistence beyond 72 hours, although ongoing at 48 hours does not establish that duration. Have the clinical/product owner review timing, branching and alert semantics together. The sketch retains the existing duration question rather than silently rewriting it.
2. **Safety guidance.** Reuse reviewed messages; do not invent diagnostic conclusions or promise monitoring response times. Bringing guidance earlier in the UI must remain aligned with server rules.
3. **Research protocol.** Do not silently replace the current three-week follow-up with the PELVIS-ROP draft’s J30 schedule or new instruments. That is a protocol/version change.
4. **Consent and reminders.** Keep required processing consent distinct from optional research use and reminders, with no preselected consent. The project README says reminder delivery still needs a dispatcher. Do not promise a delivered reminder until that capability is operational.

## What the sketch covers

- **Accueil:** a welcoming introduction and simulated granular consent choices.
- **Bureau:** a functional initial-questionnaire sketch, opening on “Votre ressenti.” Two fictional context answers are supplied to illustrate an in-progress visit. All chapters are accessible; final review catches missing required answers.
- **Mobile:** a functional 48-hour check-in with conditional intensity, exclusive “none,” back navigation, review and simulated completion.

No patient records are used. Answers exist only in the sketch’s runtime. No submission, email, reminder or clinical-record API is called. The sketches demonstrate the design and interaction; they are not a production implementation or a clinically validated revision.

Sketch verification: inspected the welcome and desktop layouts, exercised desktop selection and back navigation, and completed the mobile path through conditional intensity, a zero-valued answer, optional comment omission, review and simulated submission. Verified that “Aucune réaction” clears other reactions. Checked document width at a 320 px viewport and adjusted the number grid so measured answer targets remain 48 px wide in the checked narrow layout. This is not a full accessibility or production integration audit.

## Suggested implementation sequence

1. **Patient assignment and access boundary:** retain and test practitioner ownership end to end; establish the eligible population and release rules for network statistics.
2. **Shared visual foundation:** introduce scoped design tokens, responsive layouts, clearer typography and answer controls across patient and practitioner spaces. Keep existing form definitions and API payloads compatible.
3. **Guided patient flow and private workspace:** add chapter metadata, local validation, editable review and explicit submission states; redesign “Mes patients,” dossiers and new-response/alert handling. Preserve consent gating and the preview’s no-write guarantee.
4. **Shared observatory:** add the practitioner-accessible aggregate view with consent-aware eligibility, explicit denominators, server-side suppression and reconstruction checks. Keep account administration separately authorized.
5. **Content, resilience and pilot:** resolve the duration issue, implement reviewed early safety guidance, and add resume/reminders only with backend support. Test all three timepoints on small phones and desktop, keyboard and screen-reader use, text enlargement, zero-valued answers, optional omissions, conditional changes, consent combinations, network failure/retry, expired links, cross-practitioner access and aggregate disclosure cases. Measure completion and correction behavior without logging raw health answers in generic analytics.

The first release should connect an easier patient questionnaire with each practitioner’s private follow-up workspace and a carefully bounded shared observatory. A research-protocol revision remains a separate, versioned change.
