"use client";
import { useRegistryForm } from "./useRegistryForm";
import {
  linkEpisodePatientAction,
  type RegistryActionState,
} from "@/app/praticien/registry-actions";

export default function LinkEpisodePatientForm({
  episodeId,
  patients,
}: {
  episodeId: string;
  patients: { id: string; code: string }[];
}) {
  const { state, submit, pending } = useRegistryForm<RegistryActionState>(
    linkEpisodePatientAction.bind(null, episodeId),
    {},
  );
  if (patients.length === 0) return null;
  return (
    <details className="card">
      <summary>Rattacher cet épisode à un autre dossier patient</summary>
      <p className="muted">
        Utilisez cette fonction uniquement après avoir vérifié votre dossier
        local. Les réponses et les séances de cet épisode seront conservées.
      </p>
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="link-patient">Dossier patient</label>
          <select id="link-patient" name="patientId" required defaultValue="">
            <option value="" disabled>
              Choisir un dossier…
            </option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code}
              </option>
            ))}
          </select>
        </div>
        <label className="choice-item">
          <input type="checkbox" name="confirmLink" required />
          <span>J’ai vérifié qu’il s’agit du même patient.</span>
        </label>
        {state.error ? (
          <p role="alert" className="notice notice-danger">
            {state.error}
          </p>
        ) : null}
        {state.ok ? (
          <p role="status" className="notice notice-ok">
            Épisode rattaché au dossier sélectionné.
          </p>
        ) : null}
        <button
          className="btn btn-secondary registry-following"
          disabled={pending}
        >
          {pending ? "Enregistrement…" : "Rattacher l’épisode"}
        </button>
      </form>
    </details>
  );
}
