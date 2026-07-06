"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createEpisodeAction, type CreateEpisodeState } from "@/app/praticien/actions";
import { INDICATIONS, AGE_BANDS } from "@/lib/questionnaires";

export default function CreateEpisodeForm() {
  const [state, formAction, pending] = useActionState<CreateEpisodeState, FormData>(
    createEpisodeAction,
    {}
  );

  if (state.link) {
    return (
      <div className="card" style={{ maxWidth: 560 }}>
        <h2>Suivi créé ✓</h2>
        <p>
          Remettez ce lien ou ce QR code au patient. Il est valable 45 jours et peut être
          régénéré depuis la fiche épisode (l&apos;ancien lien sera alors révoqué).
        </p>
        <p className="notice notice-info" style={{ wordBreak: "break-all" }}>
          {state.link}
        </p>
        {state.qrDataUrl && (
          <p style={{ textAlign: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={state.qrDataUrl} alt="QR code du lien patient" width={280} height={280} />
          </p>
        )}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="btn" href={`/praticien/episode/${state.episodeId}`}>
            Voir la fiche épisode
          </Link>
          <Link className="btn btn-secondary" href="/praticien/nouveau">
            Créer un autre suivi
          </Link>
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="card" style={{ maxWidth: 560 }}>
      <div className="field">
        <label htmlFor="mainIndication">Indication principale *</label>
        <select id="mainIndication" name="mainIndication" required defaultValue="">
          <option value="" disabled>
            Choisir…
          </option>
          {INDICATIONS.map((i) => (
            <option key={i.value} value={i.value}>
              {i.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="sessionNumber">Numéro de séance *</label>
        <input id="sessionNumber" name="sessionNumber" type="number" min={1} max={20} defaultValue={1} required />
      </div>

      <div className="field">
        <label htmlFor="sessionDate">Date de la séance *</label>
        <input id="sessionDate" name="sessionDate" type="date" defaultValue={today} required />
      </div>

      <div className="field">
        <label htmlFor="ropFocus">Focalisation ROP (optionnel)</label>
        <input id="ropFocus" name="ropFocus" type="text" maxLength={120} placeholder="ex. sphère viscérale abdominale" />
      </div>

      <div className="field">
        <label htmlFor="ageBand">Tranche d&apos;âge (optionnel)</label>
        <select id="ageBand" name="ageBand" defaultValue="">
          <option value="">Non renseigné</option>
          {AGE_BANDS.map((b) => (
            <option key={b} value={b}>
              {b} ans
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="sex">Sexe (optionnel)</label>
        <select id="sex" name="sex" defaultValue="">
          <option value="">Non renseigné</option>
          <option value="F">Femme</option>
          <option value="M">Homme</option>
          <option value="X">Autre / ne souhaite pas répondre</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="contactEmail">E-mail du patient pour les rappels (optionnel)</label>
        <input id="contactEmail" name="contactEmail" type="email" placeholder="patient@exemple.fr" />
        <p className="field-help">
          Les rappels ne seront envoyés que si le patient y consent lui-même dans le
          questionnaire. L&apos;adresse est stockée séparément des réponses.
        </p>
      </div>

      {state.error && (
        <p className="notice notice-danger" role="alert">
          {state.error}
        </p>
      )}

      <button className="btn btn-block" type="submit" disabled={pending}>
        {pending ? "Création…" : "Créer et générer le lien / QR"}
      </button>
    </form>
  );
}
