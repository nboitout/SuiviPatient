import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePractitioner } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { INDICATION_LABELS, FORM_KIND_LABELS } from "@/lib/episodes";
import { FORMS } from "@/lib/questionnaires";
import { ALERT_TYPE_LABELS, SEVERITY_LABELS, ALERT_STATUS_LABELS } from "@/lib/alerts";
import EvolutionChart from "@/components/EvolutionChart";
import AlertActions from "@/components/AlertActions";
import RegenerateLink from "@/components/RegenerateLink";

// Fiche épisode (PRA-08, PRA-10) : chronologie, courbes d'évolution,
// réponses détaillées, alertes. Accès strictement limité au praticien
// propriétaire (PRA-07 / PRI-05) — tout accès est journalisé.

export default async function EpisodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePractitioner();

  const episode = await prisma.episode.findUnique({
    where: { id },
    include: {
      formTasks: { orderBy: { dueAt: "asc" } },
      responses: { orderBy: { submittedAt: "asc" } },
      alerts: { orderBy: { createdAt: "desc" } },
      contact: true,
      consents: { orderBy: { grantedAt: "asc" } },
    },
  });

  if (!episode || episode.practitionerId !== user.id) {
    if (episode) {
      await logAudit(user.id, "VIEW_EPISODE", { objectId: id, outcome: "DENIED" });
    }
    notFound();
  }

  await logAudit(user.id, "VIEW_EPISODE", { objectType: "Episode", objectId: id });

  const responses = episode.responses.map((r) => ({
    kind: r.kind,
    submittedAt: r.submittedAt,
    answers: JSON.parse(r.answers) as Record<string, unknown>,
  }));

  const scaleKeys = [
    { key: "symptom_intensity", label: "Symptôme principal", invert: false },
    { key: "daily_limitation", label: "Gêne quotidienne", invert: false },
    { key: "sleep", label: "Sommeil", invert: true },
    { key: "energy", label: "Énergie", invert: true },
    { key: "stress", label: "Stress", invert: false },
    { key: "digestive", label: "Confort digestif", invert: true },
  ];

  const chartData = responses
    .filter((r) => r.kind === "T0" || r.kind === "D21")
    .map((r) => {
      const point: Record<string, number | string | null> = { name: r.kind === "T0" ? "T0" : "J21" };
      for (const s of scaleKeys) {
        const v = Number(r.answers[s.key]);
        point[s.label] = Number.isNaN(v) || r.answers[s.key] === undefined || r.answers[s.key] === null || r.answers[s.key] === "" ? null : v;
      }
      return point;
    });

  const CHANGE_LABELS: Record<string, string> = {
    beaucoup_mieux: "Beaucoup mieux",
    mieux: "Mieux",
    un_peu_mieux: "Un peu mieux",
    inchange: "Inchangé",
    un_peu_pire: "Un peu moins bien",
    pire: "Moins bien",
    beaucoup_pire: "Beaucoup moins bien",
  };

  function formatAnswer(kind: string, fieldId: string, value: unknown): string {
    const form = FORMS[kind];
    const field = form?.fields.find((f) => f.id === fieldId);
    if (value === null || value === undefined || value === "") return "—";
    if (Array.isArray(value)) {
      return value
        .map((v) => field?.options?.find((o) => o.value === v)?.label ?? String(v))
        .join(", ");
    }
    if (typeof value === "number") return `${value}/10`;
    const s = String(value);
    return (
      field?.options?.find((o) => o.value === s)?.label ??
      CHANGE_LABELS[s] ??
      { oui: "Oui", non: "Non", na: "Non applicable", en_cours: "Toujours en cours" }[s] ??
      s
    );
  }

  return (
    <>
      <h1>
        Épisode — {INDICATION_LABELS[episode.mainIndication] ?? episode.mainIndication}, séance n°
        {episode.sessionNumber}
      </h1>
      <p className="muted">
        Séance du {episode.sessionDate.toLocaleDateString("fr-FR")}
        {episode.ropFocus ? ` · Focalisation : ${episode.ropFocus}` : ""}
        {episode.ageBand ? ` · ${episode.ageBand} ans` : ""}
        {episode.contact?.optedOutAt ? " · Rappels arrêtés par le patient" : ""}
        {" · Statut : "}
        {episode.status === "ACTIVE" ? "actif" : episode.status === "COMPLETED" ? "terminé" : "révoqué"}
      </p>

      <div className="card">
        <h2>Chronologie du suivi</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Questionnaire</th>
                <th>Échéance</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {episode.formTasks.map((t) => (
                <tr key={t.id}>
                  <td>{FORM_KIND_LABELS[t.kind]}</td>
                  <td>{t.dueAt.toLocaleDateString("fr-FR")}</td>
                  <td>
                    {t.status === "COMPLETED" ? (
                      <span className="badge badge-ok">Complété</span>
                    ) : t.status === "OPEN" ? (
                      <span className="badge badge-primary">Ouvert</span>
                    ) : (
                      <span className="badge badge-neutral">Planifié</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <RegenerateLink episodeId={episode.id} />
      </div>

      {chartData.length > 0 && (
        <div className="card">
          <h2>Évolution des échelles (0-10)</h2>
          <p className="muted">
            Sommeil, énergie et confort digestif : plus haut = mieux. Symptôme, gêne et stress :
            plus bas = mieux.
          </p>
          <EvolutionChart data={chartData} series={scaleKeys.map((s) => s.label)} />
        </div>
      )}

      {episode.alerts.length > 0 && (
        <div className="card">
          <h2>Alertes</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Sévérité</th>
                  <th>Détail</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {episode.alerts.map((a) => (
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
                      {["NEW", "ACKNOWLEDGED"].includes(a.status) ? (
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
        </div>
      )}

      {responses.map((r) => {
        const form = FORMS[r.kind];
        if (!form) return null;
        return (
          <div className="card" key={r.kind}>
            <h2>
              {FORM_KIND_LABELS[r.kind]} — répondu le {r.submittedAt.toLocaleDateString("fr-FR")}
            </h2>
            <div className="table-wrap">
              <table>
                <tbody>
                  {form.fields
                    .filter((f) => r.answers[f.id] !== undefined)
                    .map((f) => (
                      <tr key={f.id}>
                        <td style={{ width: "55%" }}>{f.label}</td>
                        <td>
                          <strong>{formatAnswer(r.kind, f.id, r.answers[f.id])}</strong>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {responses.length === 0 && (
        <div className="card">
          <p className="muted">Aucune réponse patient pour le moment.</p>
        </div>
      )}
    </>
  );
}
