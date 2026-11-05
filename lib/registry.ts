// Shared vocabulary and strict validation for practitioner-entered records.
// These labels describe observations, not validated anatomical correspondences.
import { AGE_BANDS, INDICATIONS } from "./questionnaires";

export const PRACTICE_SETTINGS = {
  cabinet: "Cabinet individuel",
  groupe: "Cabinet de groupe",
  etablissement: "Établissement",
  domicile: "À domicile",
  mixte: "Exercice mixte",
  autre: "Autre",
};
export const CASE_VOLUMES = {
  moins_10: "Moins de 10",
  de_10_30: "10 à 30",
  de_31_60: "31 à 60",
  plus_60: "Plus de 60",
};
export const DURATIONS = {
  lt1m: "Moins d’un mois",
  "1_3m": "1 à 3 mois",
  "3_12m": "3 à 12 mois",
  gt12m: "Plus de 12 mois",
  inconnu: "Non renseigné",
};
export const MEDICAL_ASSESSMENTS = {
  non_renseigne: "Non renseigné",
  non_evalue: "Pas d’évaluation médicale rapportée",
  evalue: "Évaluation médicale rapportée",
  suivi: "Suivi médical en cours",
  oriente: "Orientation médicale conseillée",
};
export const SITES = { podal: "Pied", occipital: "Occiput" };
export const SIDES = {
  gauche: "Gauche",
  droite: "Droite",
  bilateral: "Bilatéral",
  median: "Médian",
};
export const INTENSITIES = {
  legere: "Légère",
  moderee: "Modérée",
  forte: "Forte",
  non_evaluee: "Non évaluée",
};
export const CERTIFICATION_LABELS = {
  PENDING: "En attente",
  ACTIVE: "Active",
  SUSPENDED: "Suspendue",
  REVOKED: "Révoquée",
};

export class RegistryValidationError extends Error {}

export interface TrainingInput {
  module: string;
  completedOn: string;
  provider: string;
}
export interface ProfileInput {
  effectiveFrom: Date;
  professionalBackground: string;
  practiceSetting: string;
  ropStartedYear: number;
  monthlyCaseVolume: string | null;
  otherModalities: string | null;
  trainings: TrainingInput[];
}
export interface ZoneInput {
  site: string;
  zoneLabel: string;
  side: string;
  technique: string;
  intensity: string;
  durationSeconds: number | null;
  findingsBefore: string | null;
  findingsAfter: string | null;
}
export interface SessionInput {
  sessionIndex: number;
  performedAt: Date;
  protocolVersion: string;
  atlasVersion: string | null;
  durationMinutes: number;
  deviations: string | null;
  immediateResponse: string | null;
  concurrentCareChanges: string | null;
  zones: ZoneInput[];
}

function fail(label: string): never {
  throw new RegistryValidationError(`${label} : valeur manquante ou invalide.`);
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail("Formulaire");
  return value as Record<string, unknown>;
}
function text(
  value: unknown,
  label: string,
  max: number,
  required = false,
): string | null {
  if (value == null || value === "") {
    if (required) fail(label);
    return null;
  }
  if (typeof value !== "string" || value.length > max) fail(label);
  const result = value.trim();
  if (required && !result) fail(label);
  return result || null;
}
function choice(
  value: unknown,
  choices: object,
  label: string,
  required = true,
): string | null {
  const result = text(value, label, 80, required);
  if (result && !Object.hasOwn(choices, result)) fail(label);
  return result;
}
function integer(
  value: unknown,
  label: string,
  min: number,
  max: number,
  required = true,
): number | null {
  if (value == null || value === "") {
    if (required) fail(label);
    return null;
  }
  if (
    typeof value !== "number" &&
    (typeof value !== "string" || !/^\d+$/.test(value))
  )
    fail(label);
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) fail(label);
  return n;
}
export function dateOnly(value: unknown, label = "Date"): Date {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    fail(label);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value ||
    value < "1900-01-01" ||
    value > new Date().toISOString().slice(0, 10)
  )
    fail(label);
  return date;
}
export function readJson(value: unknown, label: string): unknown {
  if (typeof value !== "string" || value.length > 40_000) fail(label);
  try {
    return JSON.parse(value);
  } catch {
    return fail(label);
  }
}
export function parseProfile(form: FormData): ProfileInput {
  const effectiveFrom = dateOnly(
    form.get("effectiveFrom"),
    "Date d’effet du profil",
  );
  const raw = readJson(form.get("trainings"), "Formations");
  if (!Array.isArray(raw) || raw.length > 40) fail("Formations (40 maximum)");
  const trainings = raw.map((entry) => {
    const t = object(entry);
    return {
      module: text(t.module, "Module de formation", 160, true)!,
      completedOn: dateOnly(t.completedOn, "Date de formation")
        .toISOString()
        .slice(0, 10),
      provider: text(t.provider, "Organisme de formation", 160) ?? "",
    };
  });
  return {
    effectiveFrom,
    professionalBackground: text(
      form.get("professionalBackground"),
      "Profession / formation initiale",
      200,
      true,
    )!,
    practiceSetting: choice(
      form.get("practiceSetting"),
      PRACTICE_SETTINGS,
      "Cadre d’exercice",
    )!,
    ropStartedYear: integer(
      form.get("ropStartedYear"),
      "Année de début en ROP",
      1900,
      effectiveFrom.getUTCFullYear(),
    )!,
    monthlyCaseVolume: choice(
      form.get("monthlyCaseVolume"),
      CASE_VOLUMES,
      "Volume mensuel",
      false,
    ),
    otherModalities: text(form.get("otherModalities"), "Autres pratiques", 500),
    trainings,
  };
}
export function parseSession(value: unknown): SessionInput {
  const s = object(value);
  if (!Array.isArray(s.zones) || s.zones.length < 1 || s.zones.length > 20)
    fail("Zones traitées (1 à 20)");
  return {
    sessionIndex: integer(s.sessionIndex, "Numéro de séance", 1, 1000)!,
    performedAt: dateOnly(s.performedAt, "Date de séance"),
    protocolVersion: text(
      s.protocolVersion,
      "Version du protocole",
      100,
      true,
    )!,
    atlasVersion: text(s.atlasVersion, "Référence de cartographie", 160),
    durationMinutes: integer(
      s.durationMinutes,
      "Durée de séance en minutes",
      1,
      240,
    )!,
    deviations: text(s.deviations, "Adaptations du protocole", 1000),
    immediateResponse: text(s.immediateResponse, "Ressenti immédiat", 1000),
    concurrentCareChanges: text(
      s.concurrentCareChanges,
      "Évolution des autres traitements",
      1000,
    ),
    zones: s.zones.map((entry) => {
      const z = object(entry);
      return {
        site: choice(z.site, SITES, "Site")!,
        zoneLabel: text(z.zoneLabel, "Zone / repère", 160, true)!,
        side: choice(z.side, SIDES, "Côté")!,
        technique: text(z.technique, "Technique", 160, true)!,
        intensity: choice(z.intensity, INTENSITIES, "Intensité")!,
        durationSeconds: integer(
          z.durationSeconds,
          "Durée de stimulation en secondes",
          1,
          14400,
          false,
        ),
        findingsBefore: text(z.findingsBefore, "Observation avant", 500),
        findingsAfter: text(z.findingsAfter, "Observation après", 500),
      };
    }),
  };
}
export function parseEpisode(form: FormData) {
  const patientId = text(form.get("patientId"), "Patient", 100);
  const ageBand = choice(
    form.get("ageBand"),
    Object.fromEntries(AGE_BANDS.map((v) => [v, v])),
    "Tranche d’âge",
    false,
  );
  const sex = choice(form.get("sex"), { F: 1, M: 1, X: 1 }, "Sexe", false);
  const contactEmail = text(form.get("contactEmail"), "E-mail", 254);
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail))
    fail("E-mail");
  if (form.get("contextConsent") !== "on")
    throw new RegistryValidationError(
      "Confirmez l’accord du patient pour consigner les informations de suivi.",
    );
  return {
    patientId,
    ageBand,
    sex,
    contactEmail,
    mainIndication: choice(
      form.get("mainIndication"),
      Object.fromEntries(INDICATIONS.map((v) => [v.value, v.label])),
      "Indication",
    )!,
    presentingProblem: text(
      form.get("presentingProblem"),
      "Problème suivi",
      500,
      true,
    )!,
    symptomDuration: choice(
      form.get("symptomDuration"),
      DURATIONS,
      "Ancienneté du problème",
    )!,
    baselineSeverity: integer(
      form.get("baselineSeverity"),
      "Sévérité initiale",
      0,
      10,
      false,
    ),
    baselineImpact: integer(
      form.get("baselineImpact"),
      "Gêne initiale",
      0,
      10,
      false,
    ),
    medicalAssessment: choice(
      form.get("medicalAssessment"),
      MEDICAL_ASSESSMENTS,
      "Évaluation médicale",
    )!,
    concurrentCare: text(
      form.get("concurrentCare"),
      "Autres traitements",
      1000,
    ),
    patientExpectations: text(
      form.get("patientExpectations"),
      "Attentes du patient",
      500,
    ),
    session: parseSession(readJson(form.get("session"), "Séance")),
  };
}

export function trainingsAtDate(value: unknown, date: Date): TrainingInput[] {
  if (!Array.isArray(value)) return [];
  return value.filter((t): t is TrainingInput =>
    Boolean(
      t &&
      typeof t === "object" &&
      typeof t.module === "string" &&
      typeof t.completedOn === "string" &&
      t.completedOn <= date.toISOString().slice(0, 10),
    ),
  );
}
