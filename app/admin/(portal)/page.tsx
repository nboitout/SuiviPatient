import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/admin-access";
import RefreshButton from "@/components/RefreshButton";
import { FORM_KIND_LABELS } from "@/lib/episodes";

const actionLabels: Record<string, string> = {
  LOGIN: "Connexion à un espace",
  CREATE_PRACTITIONER: "Création d’un compte praticien",
  EXPORT_AGGREGATED: "Export des indicateurs agrégés",
  PASSWORD_CHANGE: "Modification d’un mot de passe",
  PROTOCOL_ACCEPTED: "Acceptation du protocole",
  VIEW_EPISODE: "Consultation d’un suivi",
  ALERT_ACTION: "Mise à jour d’une alerte",
};

export default async function AdminDashboard() {
  await requireAdminPage();
  const now = new Date();
  const [practitioners, episodes, responses, alerts, tasks, activity] = await Promise.all([
    prisma.user.groupBy({ by: ["certificationStatus"], where: { role: "PRACTITIONER" }, _count: true }),
    prisma.episode.groupBy({ by: ["status"], _count: true }),
    prisma.questionnaireResponse.count(),
    prisma.alert.count({ where: { status: { in: ["NEW", "ACKNOWLEDGED"] } } }),
    prisma.formTask.groupBy({
      by: ["kind", "status"],
      where: { dueAt: { lte: now }, status: { not: "CANCELLED" } },
      _count: true,
    }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, createdAt: true, action: true, outcome: true } }),
  ]);
  const practitionerCount = practitioners.reduce((sum, row) => sum + row._count, 0);
  const activePractitioners = practitioners.find((row) => row.certificationStatus === "ACTIVE")?._count ?? 0;
  const pendingPractitioners = practitioners.find((row) => row.certificationStatus === "PENDING")?._count ?? 0;
  const episodeCount = episodes.reduce((sum, row) => sum + row._count, 0);
  const activeEpisodes = episodes.find((row) => row.status === "ACTIVE")?._count ?? 0;

  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">Institut R.O.P. · Administration</p><h1>Votre réseau, en un regard.</h1><p className="muted">Suivez l’activité, accompagnez vos praticiens et explorez les tendances.</p></div>
        <RefreshButton />
      </div>
      <p className="updated-at">Actualisé le {now.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "medium", timeStyle: "short" })} · heure de Paris · toutes périodes</p>
      <div className="overview-metrics">
        <div className="overview-metric"><span>Praticiens du réseau</span><strong>{practitionerCount}</strong><small>{activePractitioners} actifs · {pendingPractitioners} en attente</small></div>
        <div className="overview-metric"><span>Épisodes de suivi</span><strong>{episodeCount}</strong><small>{activeEpisodes} en cours</small></div>
        <div className="overview-metric"><span>Questionnaires reçus</span><strong>{responses}</strong><small>Toutes les étapes du suivi</small></div>
        <div className={`overview-metric ${alerts > 0 ? "metric-attention" : ""}`}><span>Alertes ouvertes</span><strong>{alerts}</strong><small>Nouvelles ou prises en compte</small></div>
      </div>

      {practitionerCount === 0 && <div className="notice notice-info"><strong>Votre réseau est prêt à accueillir ses premiers praticiens.</strong><p>Ajoutez un compte pour permettre à un praticien de créer ses suivis et de remettre les liens personnels à ses patients.</p><Link href="/admin/praticiens?ajouter=1#ajouter" className="text-link">Ajouter le premier praticien →</Link></div>}

      <div className="dashboard-columns">
        <section className="card" aria-labelledby="completion-title">
          <div className="section-heading"><div><p className="eyebrow">Participation</p><h2 id="completion-title">Le suivi, étape par étape</h2></div></div>
          <p className="muted">Questionnaires arrivés à échéance, hors questionnaires annulés.</p>
          <div className="completion-list">
            {["T0", "D2", "D21"].map((kind) => {
              const rows = tasks.filter((row) => row.kind === kind);
              const expected = rows.reduce((sum, row) => sum + row._count, 0);
              const completed = rows.filter((row) => row.status === "COMPLETED").reduce((sum, row) => sum + row._count, 0);
              const pct = expected ? Math.round(completed / expected * 100) : null;
              return <div className="completion-item" key={kind}><div><span>{FORM_KIND_LABELS[kind]}</span><strong>{pct === null ? "—" : `${pct} %`}</strong></div><progress value={completed} max={expected || 1} aria-label={`${FORM_KIND_LABELS[kind]} : ${completed} complétés sur ${expected} attendus`} /><small>{expected ? `${completed} complétés / ${expected} attendus` : "Aucun questionnaire arrivé à échéance"}</small></div>;
            })}
          </div>
        </section>
        <section className="card admin-shortcuts" aria-labelledby="management-title">
          <p className="eyebrow">Votre quotidien</p><h2 id="management-title">Faire vivre le réseau</h2>
          <Link href="/admin/praticiens"><div><strong>Accompagner les praticiens</strong><p>Comptes, certifications et profils professionnels</p></div><span aria-hidden="true">↗</span></Link>
          <Link href="/admin/observatoire"><div><strong>Explorer les résultats</strong><p>Évolution ressentie, participation et vigilance</p></div><span aria-hidden="true">↗</span></Link>
          <a href="/api/admin/export"><div><strong>Télécharger les indicateurs</strong><p>Export agrégé au format CSV</p></div><span aria-hidden="true">↓</span></a>
        </section>
      </div>

      <section className="card" aria-labelledby="activity-title">
        <div className="section-heading"><div><p className="eyebrow">Traçabilité</p><h2 id="activity-title">Dernières activités</h2></div><Link href="/admin/audit" className="text-link">Tout le journal →</Link></div>
        {activity.length ? <ul className="activity-list">{activity.map((event) => <li key={event.id}><span className="activity-dot" aria-hidden="true" /><div><strong>{actionLabels[event.action] ?? event.action}</strong><time dateTime={event.createdAt.toISOString()}>{event.createdAt.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "medium", timeStyle: "short" })}</time></div><span className={`badge ${event.outcome === "OK" ? "badge-ok" : "badge-neutral"}`}>{event.outcome === "OK" ? "Effectué" : "Non abouti"}</span></li>)}</ul> : <p className="empty-state">Les actions du réseau apparaîtront ici.</p>}
      </section>
      <p className="muted">Cette vue présente l’activité du service. Les résultats de santé agrégés sont consultables dans l’observatoire.</p>
    </>
  );
}
