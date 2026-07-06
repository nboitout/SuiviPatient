// Moteur d'alertes (spécifications section 7).
// Ce n'est PAS un moteur de diagnostic : il rend visibles au praticien
// les réponses inhabituelles ou préoccupantes et affiche au patient un
// message de sécurité adapté, sans langage alarmiste.

import type { AlertSeverity, AlertType } from "@prisma/client";
import type { Answers } from "./questionnaires";

export interface AlertCandidate {
  type: AlertType;
  severity: AlertSeverity;
  detail: string;
  patientMessage: string;
}

const MSG_RED_FLAG =
  "Certaines de vos réponses méritent l'avis d'un médecin. Si ce signe est nouveau, sévère ou inquiétant, veuillez consulter un médecin. En cas d'urgence, contactez le 15 (SAMU) ou le 112.";
const MSG_WORSENING =
  "Votre réponse a bien été enregistrée. Si vos symptômes sont sévères ou inhabituels, veuillez demander un avis médical.";
const MSG_OVER_72H =
  "Merci d'informer votre praticien. Si les symptômes sont intenses ou inquiétants, veuillez demander un avis médical.";
const MSG_URGENT =
  "Veuillez suivre l'avis médical reçu et contacter le 15 (SAMU) ou le 112 si nécessaire. Ce questionnaire ne remplace pas une prise en charge médicale.";

export function evaluateT0(answers: Answers): AlertCandidate[] {
  const alerts: AlertCandidate[] = [];
  const flags = Array.isArray(answers.safety_screen) ? answers.safety_screen : [];
  const realFlags = flags.filter((f) => f !== "aucun");
  if (realFlags.length > 0) {
    alerts.push({
      type: "BASELINE_RED_FLAG",
      severity: "HIGH",
      detail: `Signes d'alerte cochés : ${realFlags.join(", ")}`,
      patientMessage: MSG_RED_FLAG,
    });
  }
  return alerts;
}

export function evaluateD2(answers: Answers): AlertCandidate[] {
  const alerts: AlertCandidate[] = [];
  if (answers.symptom_change === "beaucoup_pire") {
    alerts.push({
      type: "STRONG_WORSENING",
      severity: "HIGH",
      detail: "Symptôme principal « beaucoup moins bien » à J2.",
      patientMessage: MSG_WORSENING,
    });
  } else if (answers.symptom_change === "pire") {
    alerts.push({
      type: "STRONG_WORSENING",
      severity: "MEDIUM",
      detail: "Symptôme principal « moins bien » à J2.",
      patientMessage: MSG_WORSENING,
    });
  }
  const intensity = Number(answers.reaction_intensity);
  if (!Number.isNaN(intensity) && answers.reaction_intensity !== null && answers.reaction_intensity !== "" && intensity >= 8) {
    alerts.push({
      type: "HIGH_REACTION_INTENSITY",
      severity: "MEDIUM",
      detail: `Intensité de réaction ${intensity}/10 à J2.`,
      patientMessage: MSG_OVER_72H,
    });
  }
  if (answers.reaction_over_72h === "oui" || answers.reaction_over_72h === "en_cours") {
    alerts.push({
      type: "REACTION_OVER_72H",
      severity: "MEDIUM",
      detail: "Réaction persistante au-delà de 72 h.",
      patientMessage: MSG_OVER_72H,
    });
  }
  if (answers.medical_advice_needed === "oui") {
    alerts.push({
      type: "URGENT_CARE",
      severity: "HIGH",
      detail: "Le patient déclare avoir eu besoin d'un avis médical ou de soins urgents.",
      patientMessage: MSG_URGENT,
    });
  }
  return alerts;
}

export function evaluateD21(answers: Answers): AlertCandidate[] {
  const alerts: AlertCandidate[] = [];
  if (answers.global_change === "beaucoup_pire" || answers.global_change === "pire") {
    alerts.push({
      type: "STRONG_WORSENING",
      severity: answers.global_change === "beaucoup_pire" ? "HIGH" : "MEDIUM",
      detail: `Impression globale « ${answers.global_change === "beaucoup_pire" ? "beaucoup moins bien" : "moins bien"} » à J21.`,
      patientMessage: MSG_WORSENING,
    });
  }
  return alerts;
}

export function evaluate(kind: string, answers: Answers): AlertCandidate[] {
  switch (kind) {
    case "T0":
      return evaluateT0(answers);
    case "D2":
      return evaluateD2(answers);
    case "D21":
      return evaluateD21(answers);
    default:
      return [];
  }
}

export const ALERT_TYPE_LABELS: Record<string, string> = {
  BASELINE_RED_FLAG: "Signe d'alerte initial",
  STRONG_WORSENING: "Aggravation marquée",
  REACTION_OVER_72H: "Réaction > 72 h",
  URGENT_CARE: "Avis médical / soins urgents",
  HIGH_REACTION_INTENSITY: "Réaction intense",
  INCOMPLETE_D21: "Bilan J21 non complété",
};

export const ALERT_STATUS_LABELS: Record<string, string> = {
  NEW: "Nouvelle",
  ACKNOWLEDGED: "Vue",
  PATIENT_CONTACTED: "Patient contacté",
  REFERRAL_ADVISED: "Orientation médicale conseillée",
  UNDER_MEDICAL_FOLLOWUP: "Déjà suivi médicalement",
  RESOLVED: "Clôturée",
  FALSE_POSITIVE: "Faux positif",
};

export const SEVERITY_LABELS: Record<string, string> = {
  LOW: "Faible",
  MEDIUM: "Moyenne",
  HIGH: "Élevée",
};
