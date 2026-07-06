import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePractitioner } from "@/lib/auth";
import { INDICATION_LABELS } from "@/lib/episodes";
import { ALERT_TYPE_LABELS, SEVERITY_LABELS, ALERT_STATUS_LABELS } from "@/lib/alerts";
import AlertActions from "@/components/AlertActions";

// Boîte d'alertes du praticien (PRA-09) : uniquement ses propres patients.

type AlertRow = Awaited<ReturnType<typeof fetchAlerts>>[number];

function fetchAlerts(practitionerId: string) {
  return prisma.alert.findMany({
    where: { episode: { practitionerId } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { episode: { select: { id: true, mainIndication: true, sessionNumber: true } } },
  });
}

function AlertTable({ rows, actionable }: { rows: AlertRow[]; actionable: boolean }) {
  return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Sévérité</th>
              <th>Détail</th>
              <th>Épisode</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td>{a.createdAt.toLocaleDateString("fr-FR")}</td>
                <td>{ALERT_TYPE_LABELS[a.type]}</td>
                <td>
                  <span className={`badge badge-${a.severity.toLowerCase()}`}>
                    {SEVERITY_LABELS[a.severity]}
                  </span>
                </td>
                <td>{a.detail}</td>
                <td>
                  <Link href={`/praticien/episode/${a.episode.id}`}>
                    {INDICATION_LABELS[a.episode.mainIndication]} · s{a.episode.sessionNumber}
                  </Link>
                </td>
                <td>
                  {actionable ? (
                    <AlertActions alertId={a.id} current={a.status} />
                  ) : (
                    <span className="badge badge-neutral">{ALERT_STATUS_LABELS[a.status]}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
  );
}

export default async function AlertInboxPage() {
  const user = await requirePractitioner();
  const alerts = await fetchAlerts(user.id);
  const open = alerts.filter((a) => ["NEW", "ACKNOWLEDGED"].includes(a.status));
  const closed = alerts.filter((a) => !["NEW", "ACKNOWLEDGED"].includes(a.status));

  return (
    <>
      <h1>Alertes</h1>
      <p className="muted" style={{ maxWidth: 720 }}>
        Ces alertes signalent des réponses inhabituelles ou préoccupantes : elles ne constituent
        pas un diagnostic. Chaque alerte doit être examinée et qualifiée ; en cas de signe
        d&apos;alerte, documentez l&apos;orientation médicale le cas échéant.
      </p>

      <div className="card">
        <h2>À traiter ({open.length})</h2>
        {open.length === 0 ? <p className="muted">Aucune alerte en attente.</p> : <AlertTable rows={open} actionable />}
      </div>

      {closed.length > 0 && (
        <div className="card">
          <h2>Traitées ({closed.length})</h2>
          <AlertTable rows={closed} actionable={false} />
        </div>
      )}
    </>
  );
}
