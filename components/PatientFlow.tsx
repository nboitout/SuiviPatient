"use client";

// Parcours patient : notice d'information + consentement granulaire (PAT-02/03/04),
// puis questionnaire dynamique, puis confirmation avec messages de sécurité (PAT-10).

import { useState } from "react";
import type { FormDef, FieldDef, Answers } from "@/lib/questionnaires";
import { isFieldVisible } from "@/lib/questionnaires";

interface Props {
  token: string;
  form: FormDef;
  needsConsent: boolean;
  hasContact: boolean;
}

type Step = "consent" | "form" | "done";

export default function PatientFlow({ token, form, needsConsent, hasContact }: Props) {
  const [step, setStep] = useState<Step>(needsConsent ? "consent" : "form");
  const [answers, setAnswers] = useState<Answers>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [safetyMessages, setSafetyMessages] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  // Consentements
  const [ackNotice, setAckNotice] = useState(false);
  const [consentOutcomes, setConsentOutcomes] = useState(false);
  const [consentResearch, setConsentResearch] = useState(false);
  const [consentContact, setConsentContact] = useState(false);
  const [contactEmail, setContactEmail] = useState("");

  const visibleFields = form.fields.filter((f) => isFieldVisible(f, answers));
  const answeredCount = visibleFields.filter((f) => {
    const v = answers[f.id];
    return v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0);
  }).length;

  function setAnswer(id: string, value: Answers[string]) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    setErrors((prev) => prev.filter((e) => e !== id));
  }

  async function submit() {
    const missing = visibleFields
      .filter((f) => f.required)
      .filter((f) => {
        const v = answers[f.id];
        return v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
      })
      .map((f) => f.id);
    if (missing.length > 0) {
      setErrors(missing);
      document.getElementById(`field-${missing[0]}`)?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setSubmitting(true);
    setServerError(null);
    try {
      const res = await fetch("/api/patient/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          kind: form.kind,
          answers,
          consents: needsConsent
            ? {
                outcomes: consentOutcomes,
                research: consentResearch,
                contact: consentContact,
                contactEmail: consentContact ? contactEmail : undefined,
              }
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error ?? "Une erreur est survenue. Merci de réessayer.");
        return;
      }
      setSafetyMessages(data.safetyMessages ?? []);
      setStep("done");
      window.scrollTo({ top: 0 });
    } catch {
      setServerError("Connexion impossible. Vérifiez votre réseau et réessayez.");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "consent") {
    return (
      <div style={{ paddingTop: 24 }}>
        <h1>Avant de commencer</h1>
        <div className="card">
          <h2>Information</h2>
          <p>
            Vous êtes invité(e) à répondre à un court questionnaire après votre séance ROP.
            L&apos;objectif est de suivre votre évolution ressentie, d&apos;identifier toute
            réaction inhabituelle et de contribuer à améliorer la qualité de la pratique ROP.
          </p>
          <p>
            Vos réponses seront accessibles à votre praticien et pourront être utilisées par
            l&apos;institut ROP sous forme agrégée ou pseudonymisée à des fins de qualité, de
            formation et d&apos;analyse observationnelle. Aucun nom ne vous est demandé.
          </p>
          <p>
            Vous pouvez retirer votre consentement et arrêter les rappels à tout moment.
            Responsable de traitement : institut / association ROP.
          </p>
          <p className="notice notice-info" style={{ marginBottom: 0 }}>
            Ce questionnaire ne remplace pas un avis médical. En cas de symptômes sévères,
            inhabituels ou inquiétants, contactez un médecin ou le 15 (SAMU) / 112.
          </p>
        </div>

        <div className="card">
          <h2>Consentement</h2>
          <div className="choice-list">
            <label className="choice-item">
              <input type="checkbox" checked={ackNotice} onChange={(e) => setAckNotice(e.target.checked)} />
              <span>J&apos;ai lu et compris la note d&apos;information ci-dessus.</span>
            </label>
            <label className="choice-item">
              <input
                type="checkbox"
                checked={consentOutcomes}
                onChange={(e) => setConsentOutcomes(e.target.checked)}
              />
              <span>
                J&apos;accepte que mes réponses soient traitées pour mon suivi ROP et le suivi
                des résultats, et que mon praticien y accède.
              </span>
            </label>
            <label className="choice-item">
              <input
                type="checkbox"
                checked={consentResearch}
                onChange={(e) => setConsentResearch(e.target.checked)}
              />
              <span>
                <strong>Optionnel</strong> — j&apos;accepte que mes données pseudonymisées ou
                agrégées soient utilisées par l&apos;institut ROP pour l&apos;amélioration de
                la qualité, la formation et de futures analyses observationnelles.
              </span>
            </label>
            <label className="choice-item">
              <input
                type="checkbox"
                checked={consentContact}
                onChange={(e) => setConsentContact(e.target.checked)}
              />
              <span>
                <strong>Optionnel</strong> — j&apos;accepte de recevoir des rappels par e-mail
                pour les questionnaires de suivi (à 48 h et 3 semaines).
              </span>
            </label>
          </div>
          {consentContact && !hasContact && (
            <div className="field" style={{ marginTop: 14 }}>
              <label htmlFor="contact-email">Votre adresse e-mail (uniquement pour les rappels)</label>
              <input
                id="contact-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="vous@exemple.fr"
                autoComplete="email"
              />
              <p className="field-help">
                Conservée séparément de vos réponses, jamais utilisée à d&apos;autres fins.
              </p>
            </div>
          )}
        </div>

        <button
          className="btn btn-block"
          disabled={!ackNotice || !consentOutcomes || (consentContact && !hasContact && !contactEmail.includes("@"))}
          onClick={() => {
            setStep("form");
            window.scrollTo({ top: 0 });
          }}
        >
          Commencer le questionnaire
        </button>
        <p className="muted" style={{ textAlign: "center", marginTop: 10 }}>
          {form.title} — {form.estimated}
        </p>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div style={{ paddingTop: 24 }}>
        <div className="card">
          <h1>Merci, vos réponses sont enregistrées ✓</h1>
          <p>
            Votre praticien pourra les consulter pour préparer votre suivi. Vous pourrez
            répondre au questionnaire suivant via le même lien lorsque ce sera le moment.
          </p>
        </div>
        {safetyMessages.map((msg, i) => (
          <div key={i} className="notice notice-danger" role="alert">
            <strong>Important : </strong>
            {msg}
          </div>
        ))}
        <p className="muted">
          Ce questionnaire ne remplace pas un avis médical. En cas d&apos;urgence, contactez le
          15 (SAMU) ou le 112.
        </p>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 24 }}>
      <h1>{form.title}</h1>
      <p className="muted">{form.intro}</p>
      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={answeredCount}
        aria-valuemin={0}
        aria-valuemax={visibleFields.length}
        aria-label="Progression du questionnaire"
      >
        <div
          className="progress-fill"
          style={{ width: `${Math.round((answeredCount / Math.max(visibleFields.length, 1)) * 100)}%` }}
        />
      </div>

      {visibleFields.map((field) => (
        <FieldInput
          key={field.id}
          field={field}
          value={answers[field.id]}
          error={errors.includes(field.id)}
          onChange={(v) => setAnswer(field.id, v)}
        />
      ))}

      {serverError && (
        <div className="notice notice-danger" role="alert">
          {serverError}
        </div>
      )}

      <button className="btn btn-block" onClick={submit} disabled={submitting}>
        {submitting ? "Envoi en cours…" : "Envoyer mes réponses"}
      </button>
      <p className="muted" style={{ textAlign: "center", marginTop: 10 }}>
        Vos réponses restent confidentielles et pseudonymisées.
      </p>
    </div>
  );
}

function FieldInput({
  field,
  value,
  error,
  onChange,
}: {
  field: FieldDef;
  value: Answers[string];
  error: boolean;
  onChange: (v: Answers[string]) => void;
}) {
  const errorMsg = error ? <p className="field-error">Merci de répondre à cette question.</p> : null;

  if (field.type === "scale010") {
    return (
      <fieldset className="field card" id={`field-${field.id}`} style={{ border: error ? "1px solid var(--danger)" : undefined }}>
        <legend className="field-label" style={{ padding: 0 }}>
          {field.label}
          {field.required ? "" : " (optionnel)"}
        </legend>
        {field.help && <p className="field-help">{field.help}</p>}
        <div className="scale-grid">
          {Array.from({ length: 11 }, (_, n) => (
            <span key={n} style={{ position: "relative" }}>
              <input
                type="radio"
                id={`${field.id}-${n}`}
                name={field.id}
                checked={value === n}
                onChange={() => onChange(n)}
              />
              <label htmlFor={`${field.id}-${n}`}>{n}</label>
            </span>
          ))}
        </div>
        <div className="scale-labels">
          <span>0 — {field.minLabel}</span>
          <span>10 — {field.maxLabel}</span>
        </div>
        {errorMsg}
      </fieldset>
    );
  }

  if (field.type === "single" || field.type === "change7" || field.type === "yesno" || field.type === "yesnona" || field.type === "yesnoongoing") {
    const options =
      field.options ??
      (field.type === "yesno"
        ? [
            { value: "oui", label: "Oui" },
            { value: "non", label: "Non" },
          ]
        : field.type === "yesnona"
          ? [
              { value: "oui", label: "Oui" },
              { value: "non", label: "Non" },
              { value: "na", label: "Non applicable" },
            ]
          : [
              { value: "oui", label: "Oui" },
              { value: "non", label: "Non" },
              { value: "en_cours", label: "Toujours en cours" },
            ]);
    return (
      <fieldset className="field card" id={`field-${field.id}`} style={{ border: error ? "1px solid var(--danger)" : undefined }}>
        <legend className="field-label" style={{ padding: 0 }}>
          {field.label}
          {field.required ? "" : " (optionnel)"}
        </legend>
        {field.help && <p className="field-help">{field.help}</p>}
        <div className="choice-list">
          {options.map((o) => (
            <label key={o.value} className="choice-item">
              <input
                type="radio"
                name={field.id}
                checked={value === o.value}
                onChange={() => onChange(o.value)}
              />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
        {errorMsg}
      </fieldset>
    );
  }

  if (field.type === "multi") {
    const selected = Array.isArray(value) ? value : [];
    // Les options exclusives ("aucun"/"aucune") désélectionnent le reste
    const exclusive = ["aucun", "aucune"];
    function toggle(v: string) {
      if (selected.includes(v)) {
        onChange(selected.filter((x) => x !== v));
      } else if (exclusive.includes(v)) {
        onChange([v]);
      } else {
        onChange([...selected.filter((x) => !exclusive.includes(x)), v]);
      }
    }
    return (
      <fieldset className="field card" id={`field-${field.id}`} style={{ border: error ? "1px solid var(--danger)" : undefined }}>
        <legend className="field-label" style={{ padding: 0 }}>
          {field.label}
          {field.required ? "" : " (optionnel)"}
        </legend>
        {field.help && <p className="field-help">{field.help}</p>}
        <div className="choice-list">
          {field.options!.map((o) => (
            <label key={o.value} className="choice-item">
              <input type="checkbox" checked={selected.includes(o.value)} onChange={() => toggle(o.value)} />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
        {errorMsg}
      </fieldset>
    );
  }

  // text
  return (
    <div className="field card" id={`field-${field.id}`}>
      <label htmlFor={field.id} className="field-label">
        {field.label}
      </label>
      {field.help && <p className="field-help">{field.help}</p>}
      <textarea
        id={field.id}
        maxLength={field.maxLength ?? 500}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="field-help" style={{ textAlign: "right" }}>
        {typeof value === "string" ? value.length : 0}/{field.maxLength ?? 500}
      </p>
      {errorMsg}
    </div>
  );
}
