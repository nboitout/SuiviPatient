import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePractitioner } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { INDICATION_LABELS, FORM_KIND_LABELS } from "@/lib/episodes";

export default async function PatientHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePractitioner();
  const { id } = await params;
  const patient = await prisma.patient.findFirst({
    where: { id, practitionerId: user.id },
    include: {
      episodes: {
        orderBy: { startedAt: "desc" },
        include: {
          treatmentSessions: {
            orderBy: [{ performedAt: "asc" }, { sessionIndex: "asc" }],
            include: { zones: { orderBy: { sequence: "asc" } } },
          },
          responses: {
            select: { id: true, kind: true, submittedAt: true },
            orderBy: { submittedAt: "asc" },
          },
        },
      },
    },
  });
  if (!patient) notFound();
  await logAudit(user.id, "VIEW_PATIENT_HISTORY", {
    objectType: "Patient",
    objectId: id,
  });
  return (
    <>
      <p>
        <Link href="/praticien/patients">← Mes patients</Link>
      </p>
      <h1 className="patient-code">Patient {patient.code}</h1>
      <p className="muted">
        {patient.ageBand ? `${patient.ageBand} ans · ` : ""}
        {patient.episodes.length} épisode(s) ·{" "}
        {patient.episodes.reduce((n, e) => n + e.treatmentSessions.length, 0)}{" "}
        séance(s)
      </p>
      <p>
        <Link className="btn" href={`/praticien/nouveau?patient=${patient.id}`}>
          Nouvel épisode pour ce patient
        </Link>
      </p>
      {patient.legacyImported ? (
        <p className="notice notice-info">
          Dossier issu d’un ancien suivi. Si plusieurs anciens épisodes
          concernent ce patient, vous pouvez les rattacher depuis leur fiche
          après vérification de votre dossier local.
        </p>
      ) : null}
      <h2>Historique des soins et des questionnaires</h2>
      {patient.episodes.length === 0 ? (
        <div className="card">
          <p>
            Ce dossier ne contient plus d’épisode. Les épisodes rattachés à un
            autre code restent accessibles dans ce dossier de destination.
          </p>
        </div>
      ) : null}
      {patient.episodes.map((episode) => (
        <section className="card" key={episode.id}>
          <div className="action-row">
            <h2>
              {INDICATION_LABELS[episode.mainIndication] ??
                episode.mainIndication}
            </h2>
            <span className="badge badge-neutral">
              {episode.status === "ACTIVE"
                ? "Suivi en cours"
                : episode.status === "COMPLETED"
                  ? "Questionnaires terminés"
                  : "Révoqué"}
            </span>
          </div>
          <p>
            {episode.presentingProblem ??
              episode.ropFocus ??
              "Contexte initial non documenté"}
          </p>
          <p className="muted">
            Début :{" "}
            {episode.startedAt.toLocaleDateString("fr-FR", { timeZone: "UTC" })}
          </p>
          {episode.treatmentSessions.map((session) => (
            <div className="timeline-entry" key={session.id}>
              <strong>
                Séance {session.sessionIndex} ·{" "}
                {session.performedAt.toLocaleDateString("fr-FR", {
                  timeZone: "UTC",
                })}
              </strong>
              <p>
                {session.zones.length
                  ? session.zones.map((z) => z.zoneLabel).join(" → ")
                  : "Zones non documentées dans l’ancien suivi"}
              </p>
              <p className="muted">
                {session.durationMinutes
                  ? `${session.durationMinutes} min · `
                  : ""}
                {session.protocolVersion ?? "Protocole non documenté"}
              </p>
            </div>
          ))}
          <p className="muted">
            Questionnaires reçus :{" "}
            {episode.responses.length
              ? episode.responses
                  .map(
                    (r) =>
                      `${FORM_KIND_LABELS[r.kind]} (${r.submittedAt.toLocaleDateString("fr-FR")})`,
                  )
                  .join(" · ")
              : "aucun pour le moment"}
          </p>
          <div className="action-row">
            <Link
              className="btn btn-secondary"
              href={`/praticien/episode/${episode.id}`}
            >
              Voir l’épisode et les résultats
            </Link>
            {episode.status !== "REVOKED" ? (
              <Link href={`/praticien/episode/${episode.id}/seance`}>
                Ajouter une séance
              </Link>
            ) : null}
          </div>
        </section>
      ))}
    </>
  );
}
