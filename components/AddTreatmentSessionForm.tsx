"use client";
import { useRegistryForm } from "./useRegistryForm";
import Link from "next/link";
import {
  addSessionAction,
  type RegistryActionState,
} from "@/app/praticien/registry-actions";
import TreatmentSessionFields from "./TreatmentSessionFields";

export default function AddTreatmentSessionForm({
  episodeId,
  nextIndex,
  today,
  protocolVersion,
}: {
  episodeId: string;
  nextIndex: number;
  today: string;
  protocolVersion: string;
}) {
  const { state, submit, pending } = useRegistryForm<RegistryActionState>(
    addSessionAction.bind(null, episodeId),
    {},
  );
  if (state.ok)
    return (
      <div className="card">
        <h2>Séance enregistrée</h2>
        <p>
          Les détails du traitement et le profil du praticien sont conservés
          dans l’historique.
        </p>
        <Link className="btn" href={`/praticien/episode/${episodeId}`}>
          Revenir à l’épisode
        </Link>
      </div>
    );
  return (
    <form onSubmit={submit} className="card">
      <TreatmentSessionFields
        nextIndex={nextIndex}
        today={today}
        protocolVersion={protocolVersion}
      />
      {state.error ? (
        <p className="notice notice-danger" role="alert">
          {state.error}
        </p>
      ) : null}
      <button className="btn" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer la séance"}
      </button>
    </form>
  );
}
