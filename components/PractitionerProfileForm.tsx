"use client";
import { useRegistryForm } from "./useRegistryForm";

import { useState } from "react";
import {
  saveProfileAction,
  type RegistryActionState,
} from "@/app/praticien/registry-actions";
import {
  CASE_VOLUMES,
  PRACTICE_SETTINGS,
  type TrainingInput,
} from "@/lib/registry";
import { Field, SelectOptions } from "./RegistryFields";

export interface ProfileDefaults {
  professionalBackground: string;
  practiceSetting: string;
  ropStartedYear: number;
  monthlyCaseVolume: string | null;
  otherModalities: string | null;
  trainings: TrainingInput[];
}

export default function PractitionerProfileForm({
  profile,
  today,
}: {
  profile: ProfileDefaults | null;
  today: string;
}) {
  const { state, submit, pending } = useRegistryForm<RegistryActionState>(
    saveProfileAction,
    {},
  );
  const [trainings, setTrainings] = useState(
    (profile?.trainings ?? []).map((t, key) => ({ ...t, key })),
  );
  const [nextKey, setNextKey] = useState(trainings.length);
  function update(key: number, field: keyof TrainingInput, value: string) {
    setTrainings((rows) =>
      rows.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
    );
  }
  return (
    <form onSubmit={submit} className="card">
      <h2>Profil professionnel</h2>
      <p className="muted">
        Chaque enregistrement conserve une version de votre profil. Les séances
        déjà enregistrées gardent leur profil d’origine.
      </p>
      <div className="form-grid">
        <Field
          id="professionalBackground"
          label="Profession / formation initiale *"
        >
          <input
            id="professionalBackground"
            name="professionalBackground"
            required
            maxLength={200}
            defaultValue={profile?.professionalBackground ?? ""}
          />
        </Field>
        <Field id="practiceSetting" label="Cadre d’exercice *">
          <select
            id="practiceSetting"
            name="practiceSetting"
            required
            defaultValue={profile?.practiceSetting ?? ""}
          >
            <option value="" disabled>
              Choisir…
            </option>
            <SelectOptions options={PRACTICE_SETTINGS} />
          </select>
        </Field>
        <Field id="ropStartedYear" label="Année de début de pratique ROP *">
          <input
            id="ropStartedYear"
            name="ropStartedYear"
            type="number"
            required
            min={1900}
            max={Number(today.slice(0, 4))}
            defaultValue={profile?.ropStartedYear ?? ""}
          />
        </Field>
        <Field
          id="monthlyCaseVolume"
          label="Nombre approximatif de patients ROP par mois"
        >
          <select
            id="monthlyCaseVolume"
            name="monthlyCaseVolume"
            defaultValue={profile?.monthlyCaseVolume ?? ""}
          >
            <option value="">Non renseigné</option>
            <SelectOptions options={CASE_VOLUMES} />
          </select>
        </Field>
        <Field
          id="effectiveFrom"
          label="Profil applicable à partir du *"
          help="Pour une séance passée, indiquez la date à laquelle ce profil était déjà valable."
        >
          <input
            id="effectiveFrom"
            name="effectiveFrom"
            type="date"
            required
            max={today}
            defaultValue={today}
          />
        </Field>
        <Field id="otherModalities" label="Autres pratiques utilisées">
          <textarea
            id="otherModalities"
            name="otherModalities"
            maxLength={500}
            defaultValue={profile?.otherModalities ?? ""}
          />
        </Field>
      </div>
      <h3>Formations ROP suivies</h3>
      <input
        type="hidden"
        name="trainings"
        value={JSON.stringify(
          trainings.map((training) => ({
            module: training.module,
            completedOn: training.completedOn,
            provider: training.provider,
          })),
        )}
      />
      {trainings.length === 0 ? (
        <p className="muted">Aucune formation renseignée.</p>
      ) : null}
      {trainings.map((training, index) => (
        <fieldset className="zone-card" key={training.key}>
          <legend>Formation {index + 1}</legend>
          <div className="form-grid">
            <Field id={`module-${training.key}`} label="Module / intitulé *">
              <input
                id={`module-${training.key}`}
                required
                maxLength={160}
                value={training.module}
                onChange={(e) => update(training.key, "module", e.target.value)}
              />
            </Field>
            <Field id={`completed-${training.key}`} label="Date d’obtention *">
              <input
                id={`completed-${training.key}`}
                type="date"
                required
                max={today}
                value={training.completedOn}
                onChange={(e) =>
                  update(training.key, "completedOn", e.target.value)
                }
              />
            </Field>
            <Field id={`provider-${training.key}`} label="Organisme">
              <input
                id={`provider-${training.key}`}
                maxLength={160}
                value={training.provider}
                onChange={(e) =>
                  update(training.key, "provider", e.target.value)
                }
              />
            </Field>
          </div>
          <button
            className="btn btn-secondary btn-small"
            type="button"
            aria-label={`Retirer la formation ${index + 1}`}
            onClick={() =>
              setTrainings(trainings.filter((t) => t.key !== training.key))
            }
          >
            Retirer
          </button>
        </fieldset>
      ))}
      <button
        className="btn btn-secondary"
        type="button"
        disabled={trainings.length >= 40}
        onClick={() => {
          setTrainings([
            ...trainings,
            { key: nextKey, module: "", completedOn: "", provider: "" },
          ]);
          setNextKey(nextKey + 1);
        }}
      >
        Ajouter une formation
      </button>
      {state.error ? (
        <p className="notice notice-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="notice notice-ok" role="status">
          Profil enregistré. Les prochaines séances utiliseront la version
          applicable à leur date.
        </p>
      ) : null}
      <div className="registry-following">
        <button className="btn" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer mon profil"}
        </button>
      </div>
    </form>
  );
}
