"use client";

import { useState } from "react";
import { useRegistryForm } from "./useRegistryForm";
import Link from "next/link";
import {
  createEpisodeAction,
  type CreateEpisodeState,
} from "@/app/praticien/actions";
import { INDICATIONS, AGE_BANDS } from "@/lib/questionnaires";
import { DURATIONS, MEDICAL_ASSESSMENTS } from "@/lib/registry";
import { Field, SelectOptions } from "./RegistryFields";
import TreatmentSessionFields from "./TreatmentSessionFields";

export default function CreateEpisodeForm({
  patients,
  initialPatientId,
  today,
  protocolVersion,
}: {
  patients: {
    id: string;
    code: string;
    ageBand: string | null;
    sex: string | null;
  }[];
  initialPatientId: string;
  today: string;
  protocolVersion: string;
}) {
  const [patientId, setPatientId] = useState(initialPatientId);
  const selectedPatient = patients.find((p) => p.id === patientId);
  const { state, submit, pending } = useRegistryForm<CreateEpisodeState>(
    createEpisodeAction,
    {},
  );

  if (state.link) {
    return (
      <div className="card" style={{ maxWidth: 560 }}>
        <h2>Suivi créé ✓</h2>
        <p>
          Remettez ce lien ou ce QR code au patient. Il est valable 45 jours et
          peut être régénéré depuis la fiche épisode (l&apos;ancien lien sera
          alors révoqué).
        </p>
        <p className="notice notice-info" style={{ wordBreak: "break-all" }}>
          {state.link}
        </p>
        {state.qrDataUrl && (
          <p style={{ textAlign: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={state.qrDataUrl}
              alt="QR code du lien patient"
              width={280}
              height={280}
            />
          </p>
        )}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn" href={`/praticien/episode/${state.episodeId}`}>
            Voir la fiche épisode
          </Link>
          {/* A full navigation resets the completed form, including on this same URL. */}
          <a className="btn btn-secondary" href="/praticien/nouveau">
            Créer un autre suivi
          </a>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card">
      <fieldset className="registry-section">
        <legend>Patient</legend>
        <Field id="patientId" label="Dossier patient">
          <select
            id="patientId"
            name="patientId"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
          >
            <option value="">Nouveau patient — générer un code</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code}
              </option>
            ))}
          </select>
        </Field>
        <div className="form-grid" key={patientId}>
          <Field id="ageBand" label="Tranche d’âge">
            <select
              id="ageBand"
              name="ageBand"
              defaultValue={selectedPatient?.ageBand ?? ""}
            >
              <option value="">Non renseignée</option>
              {AGE_BANDS.map((b) => (
                <option key={b} value={b}>
                  {b} ans
                </option>
              ))}
            </select>
          </Field>
          <Field id="sex" label="Sexe">
            <select
              id="sex"
              name="sex"
              defaultValue={selectedPatient?.sex ?? ""}
            >
              <option value="">Non renseigné</option>
              <option value="F">Femme</option>
              <option value="M">Homme</option>
              <option value="X">Autre / ne souhaite pas répondre</option>
            </select>
          </Field>
        </div>
        {patientId ? (
          <p className="notice notice-info">
            Ce nouvel épisode rejoindra l’historique du patient sélectionné.
            Vérifiez la tranche d’âge actuelle ; les épisodes précédents
            conserveront leur contexte initial. Pour une séance supplémentaire
            du même problème, ouvrez l’épisode existant.
          </p>
        ) : null}
        <Field
          id="contactEmail"
          label="E-mail pour les rappels (optionnel)"
          help="Conservé séparément. Le patient choisira lui-même s’il accepte les rappels."
        >
          <input
            id="contactEmail"
            name="contactEmail"
            type="email"
            maxLength={254}
          />
        </Field>
      </fieldset>
      <fieldset className="registry-section">
        <legend>Contexte au début de cet épisode</legend>
        <p className="muted">
          Informations recueillies et consignées par le praticien. Utilisez
          uniquement les détails utiles au suivi, sans nom ni autre identifiant.
        </p>
        <Field id="mainIndication" label="Indication principale *">
          <select
            id="mainIndication"
            name="mainIndication"
            required
            defaultValue=""
          >
            <option value="" disabled>
              Choisir…
            </option>
            {INDICATIONS.map((i) => (
              <option key={i.value} value={i.value}>
                {i.label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="presentingProblem" label="Problème précis suivi *">
          <textarea
            id="presentingProblem"
            name="presentingProblem"
            required
            maxLength={500}
          />
        </Field>
        <div className="form-grid">
          <Field id="symptomDuration" label="Ancienneté du problème *">
            <select
              id="symptomDuration"
              name="symptomDuration"
              required
              defaultValue="inconnu"
            >
              <SelectOptions options={DURATIONS} />
            </select>
          </Field>
          <Field id="medicalAssessment" label="Évaluation médicale rapportée *">
            <select
              id="medicalAssessment"
              name="medicalAssessment"
              required
              defaultValue="non_renseigne"
            >
              <SelectOptions options={MEDICAL_ASSESSMENTS} />
            </select>
          </Field>
          <Field
            id="baselineSeverity"
            label="Sévérité initiale rapportée (0–10)"
          >
            <input
              id="baselineSeverity"
              name="baselineSeverity"
              type="number"
              min={0}
              max={10}
            />
            <p className="field-help">
              0 : aucun symptôme · 10 : pire imaginable
            </p>
          </Field>
          <Field id="baselineImpact" label="Gêne quotidienne initiale (0–10)">
            <input
              id="baselineImpact"
              name="baselineImpact"
              type="number"
              min={0}
              max={10}
            />
            <p className="field-help">0 : aucune gêne · 10 : gêne extrême</p>
          </Field>
        </div>
        <Field
          id="concurrentCare"
          label="Traitements, médicaments et autres prises en charge en cours"
        >
          <textarea
            id="concurrentCare"
            name="concurrentCare"
            maxLength={1000}
          />
        </Field>
        <Field
          id="patientExpectations"
          label="Attentes / objectif exprimé par le patient"
        >
          <textarea
            id="patientExpectations"
            name="patientExpectations"
            maxLength={500}
          />
        </Field>
      </fieldset>
      <TreatmentSessionFields today={today} protocolVersion={protocolVersion} />
      <label className="choice-item">
        <input type="checkbox" name="contextConsent" required />
        <span>
          J’ai informé le patient et recueilli son accord pour consigner ces
          informations de suivi. Il recevra ensuite la notice et les choix de
          consentement du questionnaire.
        </span>
      </label>
      {state.error ? (
        <p className="notice notice-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      <button
        className="btn registry-following"
        type="submit"
        disabled={pending}
      >
        {pending ? "Création…" : "Créer l’épisode et le lien patient"}
      </button>
    </form>
  );
}
