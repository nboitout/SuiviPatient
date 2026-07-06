import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePractitioner } from "@/lib/auth";
import { INDICATION_LABELS, FORM_KIND_LABELS } from "@/lib/episodes";
import { ALERT_TYPE_LABELS, SEVERITY_LABELS } from "@/lib/alerts";

// Tableau de bord praticien (8.1) : suivis actifs, alertes, complétude.
// Ne montre que les épisodes du praticien connecté (PRA-07).

export default async function PractitionerDashboard() {
  const user = await requirePractitioner();

  const [episodes, openAlerts] = await Promise.all([
    prisma.episode.findMany({
      where: { practitionerId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        formTasks: true,
        responses: { select: { kind: true, submittedAt: true } },
        alerts: { where: { status: { in: ["NEW", "ACKNOWLEDGED"] } }, select: { id: true } },
      },
    }),
    prisma.alert.findMany({
      where: { episode: { practitionerId: user.id }, status: "NEW" },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { episode: { select: { id: true, mainIndication: true } } },
    }),
  ]);

  const active = episodes.filter((e) => e.status === "ACTIVE");
  const awaitingD21 = active.filter((e) => !e.responses.some((r) => r.kind === "D21"));

  return (
    <>
      <h1>Tableau de bord</h1>

      <div className="stat-row">
        <div className="stat-tile">
          <div className="stat-value">{active.length}</div>
          <div className="stat-label">Suivis actifs</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value">{openAlerts.length}</div>
          <div className="stat-label">Nouvelles alertes</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value">{awaitingD21.length}</div>
          <div className="stat-label">Bilans J21 attendus</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value">{episodes.length}</div>
          <div className="stat-label">Épisodes au total</div>
        </div>
      </div>

      {openAlerts.length > 0 && (
        <div className="card">
          <h2>Nouvelles alertes</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Sévérité</th>
                  <th>Épisode</th>
                </tr>
              </thead>
              <tbody>
                {openAlerts.map((a) => (
                  <tr key={a.id}>
                    <td>{a.createdAt.toLocaleDateString("fr-FR")}</td>
                    <td>{ALERT_TYPE_LABELS[a.type]}</td>
                    <td>
                      <span className={`badge badge-${a.severity.toLowerCase()}`}>
                        {SEVERITY_LABELS[a.severity]}
                      </span>
                    </td>
                    <td>
                      <Link href={`/praticien/episode/${a.episode.id}`}>
                        {INDICATION_LABELS[a.episode.mainIndication]}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            <Link href="/praticien/alertes">Voir toutes les alertes →</Link>
          </p>
        </div>
      )}

      <div className="card">
        <h2>Mes suivis patients</h2>
        {episodes.length === 0 ? (
          <p className="muted">
            Aucun suivi pour le moment.{" "}
            <Link href="/praticien/nouveau">Créez votre premier suivi patient</Link> pour générer
            un lien / QR code à remettre au patient.
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Créé le</th>
                  <th>Indication</th>
                  <th>Séance</th>
                  <th>Réponses</th>
                  <th>Prochaine étape</th>
                  <th>Alertes</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {episodes.map((e) => {
                  const done = e.responses.map((r) => r.kind as string);
                  const order = ["T0", "D2", "D21"];
                  const nextTask = e.formTasks
                    .filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED" && !done.includes(t.kind))
                    .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))[0];
                  return (
                    <tr key={e.id}>
                      <td>{e.createdAt.toLocaleDateString("fr-FR")}</td>
                      <td>{INDICATION_LABELS[e.mainIndication] ?? e.mainIndication}</td>
                      <td>n°{e.sessionNumber}</td>
                      <td>
                        {order.map((k) => (
                          <span
                            key={k}
                            className={`badge ${done.includes(k) ? "badge-ok" : "badge-neutral"}`}
                            style={{ marginRight: 4 }}
                          >
                            {k}
                          </span>
                        ))}
                      </td>
                      <td className="muted">
                        {e.status === "COMPLETED"
                          ? "Terminé"
                          : nextTask
                            ? `${FORM_KIND_LABELS[nextTask.kind]} — dû le ${nextTask.dueAt.toLocaleDateString("fr-FR")}`
                            : "—"}
                      </td>
                      <td>
                        {e.alerts.length > 0 ? (
                          <span className="badge badge-high">{e.alerts.length}</span>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        <Link href={`/praticien/episode/${e.id}`}>Détail</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
