import type { Prisma } from "@prisma/client";
import {
  SITES,
  SIDES,
  INTENSITIES,
  PRACTICE_SETTINGS,
  CERTIFICATION_LABELS,
  trainingsAtDate,
} from "@/lib/registry";

type Session = Prisma.TreatmentSessionGetPayload<{ include: { zones: true } }>;
function label(labels: Record<string, string>, value: unknown) {
  return typeof value === "string" ? (labels[value] ?? value) : "Non documenté";
}

export default function TreatmentSessionHistory({
  sessions,
}: {
  sessions: Session[];
}) {
  return sessions.map((session) => {
    const snapshot =
      session.practitionerSnapshot &&
      typeof session.practitionerSnapshot === "object" &&
      !Array.isArray(session.practitionerSnapshot)
        ? session.practitionerSnapshot
        : null;
    return (
      <article className="card" key={session.id}>
        <h3>
          Séance {session.sessionIndex} ·{" "}
          {session.performedAt.toLocaleDateString("fr-FR", { timeZone: "UTC" })}
        </h3>
        {session.legacyImported ? (
          <p className="notice notice-info">
            Séance issue de l’ancien suivi. Les détails du geste et les
            qualifications à cette date n’étaient pas documentés.
          </p>
        ) : null}
        <dl className="record-meta">
          <div>
            <dt>Durée</dt>
            <dd>
              {session.durationMinutes == null
                ? "Non documentée"
                : `${session.durationMinutes} minutes`}
            </dd>
          </div>
          <div>
            <dt>Protocole appliqué</dt>
            <dd>{session.protocolVersion ?? "Non documenté"}</dd>
          </div>
          <div>
            <dt>Cartographie / édition</dt>
            <dd>{session.atlasVersion ?? "Non renseignée"}</dd>
          </div>
        </dl>
        {session.zones.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ordre / zone</th>
                  <th>Geste</th>
                  <th>Intensité / durée</th>
                  <th>Observations tissulaires</th>
                </tr>
              </thead>
              <tbody>
                {session.zones.map((zone) => (
                  <tr key={zone.id}>
                    <td>
                      {zone.sequence}. {zone.zoneLabel}
                      <br />
                      <span className="muted">
                        {label(SITES, zone.site)} · {label(SIDES, zone.side)}
                      </span>
                    </td>
                    <td>{zone.technique}</td>
                    <td>
                      {label(INTENSITIES, zone.intensity)}
                      {zone.durationSeconds
                        ? ` · ${zone.durationSeconds} s`
                        : ""}
                    </td>
                    <td>
                      {zone.findingsBefore ? (
                        <p>Avant : {zone.findingsBefore}</p>
                      ) : null}
                      {zone.findingsAfter ? (
                        <p>Après : {zone.findingsAfter}</p>
                      ) : null}
                      {!zone.findingsBefore && !zone.findingsAfter ? "—" : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <dl className="record-meta registry-following">
          <div>
            <dt>Adaptations et raisons</dt>
            <dd>{session.deviations ?? "Non renseignées"}</dd>
          </div>
          <div>
            <dt>Ressenti immédiat rapporté au praticien</dt>
            <dd>{session.immediateResponse ?? "Non renseigné"}</dd>
          </div>
          <div>
            <dt>Changements des autres traitements</dt>
            <dd>{session.concurrentCareChanges ?? "Non renseignés"}</dd>
          </div>
        </dl>
        <details>
          <summary>Profil du praticien conservé pour cette séance</summary>
          {snapshot ? (
            <>
              <p>
                {String(snapshot.professionalBackground ?? "Non documenté")} ·{" "}
                {label(PRACTICE_SETTINGS, snapshot.practiceSetting)} · ROP
                depuis {String(snapshot.ropStartedYear ?? "—")}
              </p>
              <p>
                Certification à cette date :{" "}
                {label(CERTIFICATION_LABELS, snapshot.certificationStatus)}.
              </p>
              <ul>
                {trainingsAtDate(snapshot.trainings, session.performedAt).map(
                  (t, i) => (
                    <li key={i}>
                      {t.module} · {t.completedOn}
                      {t.provider ? ` · ${t.provider}` : ""}
                    </li>
                  ),
                )}
              </ul>
            </>
          ) : (
            <p className="muted">Profil historique non disponible.</p>
          )}
        </details>
      </article>
    );
  });
}
