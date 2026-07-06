// Moteur de questionnaires — définitions V1 (spécifications section 6).
// Les formulaires sont définis en configuration : champs typés, logique
// conditionnelle simple, versionnage. Chaque réponse stocke la version
// du questionnaire pour rester interprétable après évolution (6.1).

export const QUESTIONNAIRE_VERSION = "v1.0";

export type FieldType =
  | "scale010" // échelle numérique 0-10
  | "change7" // échelle de changement en 7 points
  | "single" // choix unique
  | "multi" // choix multiples
  | "yesno"
  | "yesnona"
  | "yesnoongoing"
  | "text";

export interface FieldDef {
  id: string;
  type: FieldType;
  label: string;
  help?: string;
  required: boolean;
  options?: { value: string; label: string }[];
  minLabel?: string; // libellé du 0 pour les échelles
  maxLabel?: string; // libellé du 10
  maxLength?: number;
  // Logique conditionnelle simple (6.1) : champ affiché si
  // answers[dependsOn.field] === value ou inclus dans values
  showIf?: { field: string; values: string[] };
}

export interface FormDef {
  kind: "T0" | "D2" | "D21";
  title: string;
  intro: string;
  estimated: string;
  fields: FieldDef[];
}

export const INDICATIONS = [
  { value: "douleur_mobilite", label: "Douleur / mobilité" },
  { value: "digestif", label: "Confort digestif" },
  { value: "stress_anxiete", label: "Stress / anxiété" },
  { value: "sommeil", label: "Sommeil" },
  { value: "fatigue", label: "Fatigue" },
  { value: "pelvien_urogenital", label: "Pelvien / uro-génital" },
  { value: "post_trauma_chirurgie", label: "Post-traumatique / post-chirurgical" },
  { value: "autre", label: "Autre" },
];

export const AGE_BANDS = ["18-30", "31-45", "46-60", "61-75", "76+"];

export const RED_FLAGS = [
  { value: "fievre", label: "Fièvre inexpliquée" },
  { value: "perte_poids", label: "Perte de poids inexpliquée" },
  { value: "sang", label: "Sang dans les selles ou les urines" },
  { value: "douleur_nocturne", label: "Douleur nocturne inhabituelle" },
  { value: "douleur_thoracique", label: "Douleur thoracique" },
  { value: "essoufflement", label: "Essoufflement anormal" },
  { value: "deficit_neuro", label: "Faiblesse ou trouble neurologique (bras, jambe, parole, vision)" },
  { value: "aggravation", label: "Aggravation progressive et continue" },
  { value: "fatigue_severe", label: "Fatigue sévère et inhabituelle" },
  { value: "aucun", label: "Aucun de ces signes" },
];

const CHANGE_7 = [
  { value: "beaucoup_mieux", label: "Beaucoup mieux" },
  { value: "mieux", label: "Mieux" },
  { value: "un_peu_mieux", label: "Un peu mieux" },
  { value: "inchange", label: "Inchangé" },
  { value: "un_peu_pire", label: "Un peu moins bien" },
  { value: "pire", label: "Moins bien" },
  { value: "beaucoup_pire", label: "Beaucoup moins bien" },
];

// ---------- T0 — questionnaire initial (6.3) ----------

export const FORM_T0: FormDef = {
  kind: "T0",
  title: "Questionnaire initial",
  intro:
    "Ce court questionnaire établit votre point de départ avant ou juste après votre première séance ROP. Il prend moins de 3 minutes.",
  estimated: "≈ 3 minutes",
  fields: [
    {
      id: "main_reason",
      type: "single",
      label: "Motif principal de consultation",
      required: true,
      options: INDICATIONS,
    },
    {
      id: "symptom_duration",
      type: "single",
      label: "Depuis combien de temps ressentez-vous ce problème ?",
      required: true,
      options: [
        { value: "lt1m", label: "Moins d'1 mois" },
        { value: "1_3m", label: "1 à 3 mois" },
        { value: "3_12m", label: "3 à 12 mois" },
        { value: "gt12m", label: "Plus de 12 mois" },
        { value: "na", label: "Non applicable" },
      ],
    },
    {
      id: "symptom_intensity",
      type: "scale010",
      label: "Intensité de votre symptôme principal aujourd'hui",
      required: true,
      minLabel: "Aucun symptôme",
      maxLabel: "Pire imaginable",
    },
    {
      id: "daily_limitation",
      type: "scale010",
      label: "Gêne dans vos activités quotidiennes",
      required: true,
      minLabel: "Pas limité(e)",
      maxLabel: "Extrêmement limité(e)",
    },
    {
      id: "sleep",
      type: "scale010",
      label: "Qualité de votre sommeil ces 7 derniers jours",
      required: true,
      minLabel: "Très mauvaise",
      maxLabel: "Excellente",
    },
    {
      id: "energy",
      type: "scale010",
      label: "Énergie / vitalité ces 7 derniers jours",
      required: true,
      minLabel: "Épuisé(e)",
      maxLabel: "Excellente vitalité",
    },
    {
      id: "stress",
      type: "scale010",
      label: "Stress / tension émotionnelle ces 7 derniers jours",
      required: true,
      minLabel: "Aucun",
      maxLabel: "Extrême",
    },
    {
      id: "digestive",
      type: "scale010",
      label: "Confort digestif / viscéral",
      required: false,
      minLabel: "Très inconfortable",
      maxLabel: "Très confortable",
      showIf: { field: "main_reason", values: ["digestif", "pelvien_urogenital"] },
    },
    {
      id: "medical_followup",
      type: "yesnona",
      label: "Êtes-vous suivi(e) médicalement pour ce problème ?",
      required: true,
    },
    {
      id: "safety_screen",
      type: "multi",
      label: "Présentez-vous actuellement l'un de ces signes ?",
      help: "Cochez tout ce qui s'applique. Ces questions servent uniquement à votre sécurité.",
      required: true,
      options: RED_FLAGS,
    },
    {
      id: "free_comment",
      type: "text",
      label: "Commentaire libre (optionnel)",
      help: "Merci de ne pas saisir d'antécédents médicaux détaillés.",
      required: false,
      maxLength: 500,
    },
  ],
};

// ---------- D2 — 24-48h après la séance (6.4) ----------

export const FORM_D2: FormDef = {
  kind: "D2",
  title: "Suivi à 48 h",
  intro:
    "Comment avez-vous réagi depuis votre séance ROP ? Ce questionnaire prend moins de 90 secondes.",
  estimated: "≈ 90 secondes",
  fields: [
    {
      id: "symptom_change",
      type: "change7",
      label: "Votre symptôme principal depuis la séance",
      required: true,
      options: CHANGE_7,
    },
    {
      id: "reactions",
      type: "multi",
      label: "Avez-vous ressenti l'une de ces réactions ?",
      required: true,
      options: [
        { value: "fatigue", label: "Fatigue" },
        { value: "courbatures", label: "Courbatures / sensibilité" },
        { value: "urines", label: "Urines plus fréquentes" },
        { value: "transit", label: "Changement de transit" },
        { value: "emotions", label: "Sensibilité émotionnelle" },
        { value: "reves", label: "Rêves intenses" },
        { value: "repos", label: "Besoin de repos" },
        { value: "aucune", label: "Aucune réaction" },
        { value: "autre", label: "Autre" },
      ],
    },
    {
      id: "reaction_intensity",
      type: "scale010",
      label: "Intensité de la réaction la plus marquante",
      required: false,
      minLabel: "Très légère",
      maxLabel: "Très intense",
      showIf: {
        field: "reactions",
        values: ["fatigue", "courbatures", "urines", "transit", "emotions", "reves", "repos", "autre"],
      },
    },
    {
      id: "reaction_over_72h",
      type: "yesnoongoing",
      label: "Cette réaction a-t-elle duré plus de 72 h ?",
      required: true,
    },
    {
      id: "medical_advice_needed",
      type: "yesno",
      label: "Avez-vous eu besoin d'un avis médical ou de soins urgents ?",
      required: true,
    },
    {
      id: "free_comment",
      type: "text",
      label: "Commentaire libre (optionnel)",
      required: false,
      maxLength: 500,
    },
  ],
};

// ---------- D21 — critère principal (6.5) ----------

export const FORM_D21: FormDef = {
  kind: "D21",
  title: "Bilan à 3 semaines",
  intro:
    "Trois semaines après votre séance, comment évaluez-vous votre évolution ? Moins de 90 secondes.",
  estimated: "≈ 90 secondes",
  fields: [
    {
      id: "global_change",
      type: "change7",
      label: "Globalement, depuis votre séance ROP, vous vous sentez…",
      required: true,
      options: CHANGE_7,
    },
    {
      id: "symptom_intensity",
      type: "scale010",
      label: "Intensité de votre symptôme principal aujourd'hui",
      required: true,
      minLabel: "Aucun symptôme",
      maxLabel: "Pire imaginable",
    },
    {
      id: "daily_limitation",
      type: "scale010",
      label: "Gêne dans vos activités quotidiennes aujourd'hui",
      required: true,
      minLabel: "Pas limité(e)",
      maxLabel: "Extrêmement limité(e)",
    },
    {
      id: "sleep",
      type: "scale010",
      label: "Qualité de votre sommeil ces 7 derniers jours",
      required: true,
      minLabel: "Très mauvaise",
      maxLabel: "Excellente",
    },
    {
      id: "energy",
      type: "scale010",
      label: "Énergie / vitalité ces 7 derniers jours",
      required: true,
      minLabel: "Épuisé(e)",
      maxLabel: "Excellente vitalité",
    },
    {
      id: "stress",
      type: "scale010",
      label: "Stress / tension émotionnelle ces 7 derniers jours",
      required: true,
      minLabel: "Aucun",
      maxLabel: "Extrême",
    },
    {
      id: "digestive",
      type: "scale010",
      label: "Confort digestif / viscéral",
      required: false,
      minLabel: "Très inconfortable",
      maxLabel: "Très confortable",
    },
    {
      id: "benefit_duration",
      type: "single",
      label: "Combien de temps le bénéfice ressenti a-t-il duré ?",
      required: true,
      options: [
        { value: "aucun", label: "Aucun bénéfice ressenti" },
        { value: "lt24h", label: "Moins de 24 h" },
        { value: "1_3j", label: "1 à 3 jours" },
        { value: "4_7j", label: "4 à 7 jours" },
        { value: "gt1sem", label: "Plus d'une semaine" },
        { value: "toujours", label: "Toujours présent" },
      ],
    },
    {
      id: "continue_rop",
      type: "single",
      label: "Souhaitez-vous poursuivre les séances ROP ?",
      required: false,
      options: [
        { value: "oui", label: "Oui" },
        { value: "non", label: "Non" },
        { value: "ne_sait_pas", label: "Je ne sais pas encore" },
      ],
    },
    {
      id: "what_changed",
      type: "text",
      label: "Qu'est-ce qui a le plus changé pour vous ? (optionnel)",
      required: false,
      maxLength: 500,
    },
  ],
};

export const FORMS: Record<string, FormDef> = {
  T0: FORM_T0,
  D2: FORM_D2,
  D21: FORM_D21,
};

export type Answers = Record<string, string | string[] | number | null>;

export function isFieldVisible(field: FieldDef, answers: Answers): boolean {
  if (!field.showIf) return true;
  const v = answers[field.showIf.field];
  if (Array.isArray(v)) return v.some((x) => field.showIf!.values.includes(x));
  return typeof v === "string" && field.showIf.values.includes(v);
}

// Validation serveur : champs requis visibles remplis, valeurs conformes.
export function validateAnswers(form: FormDef, answers: Answers): string[] {
  const errors: string[] = [];
  for (const field of form.fields) {
    if (!isFieldVisible(field, answers)) continue;
    const v = answers[field.id];
    const empty =
      v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
    if (field.required && empty) {
      errors.push(field.id);
      continue;
    }
    if (empty) continue;
    if (field.type === "scale010") {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0 || n > 10) errors.push(field.id);
    }
    if (field.type === "text" && typeof v === "string" && v.length > (field.maxLength ?? 500)) {
      errors.push(field.id);
    }
    if ((field.type === "single" || field.type === "change7") && field.options) {
      if (!field.options.some((o) => o.value === v)) errors.push(field.id);
    }
    if (field.type === "multi" && field.options) {
      const arr = Array.isArray(v) ? v : [v];
      if (!arr.every((x) => field.options!.some((o) => o.value === x))) errors.push(field.id);
    }
  }
  return errors;
}
