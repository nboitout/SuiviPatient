import { computeNetworkMetrics, MIN_CELL_SIZE } from "@/lib/aggregate";
import { FORM_KIND_LABELS } from "@/lib/episodes";

// Tableau de bord réseau de l'institut (ADM-04, 8.2).
// Uniquement des données agrégées : aucune donnée de contact patient,
// cellules < MIN_CELL_SIZE supprimées (8.3).

export const dynamic = "force-dynamic";

function pct(v: number | null): string {
  return v === null ? `— (n < ${MIN_CELL_SIZE})` : `${Math.round(v * 100)} %`;
}

export default async function AdminDashboard() {
  const m = await computeNetworkMetrics();

  return (
    <>
      <h1>Observatoire du réseau</h1>
      <p className="muted" style={{ maxWidth: 760 }}>
        Données agrégées et pseudonymisées. Ces indicateurs mesurent l&apos;évolution{" "}
        <strong>ressentie par les patients</strong> (amélioration rapportée), pas une efficacité
        clinique démontrée. Les cellules portant sur moins de {MIN_CELL_SIZE} épisodes sont
        masquées pour limiter le risque de ré-identification.
      </p>

      <div className="stat-row">
        <div className="stat-tile">
          <div className="stat-value">{m.episodeCount}</div>
          <div className="stat-label">Épisodes de suivi</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value">{m.practitionerCount}</div>
          <div className="stat-label">Praticiens</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value">{pct(m.d21ImprovementRate)}</div>
          <div className="stat-label">Amélioration ressentie à J21</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value">
            {m.meanSymptomChange === null ? "—" : m.meanSymptomChange.toFixed(1)}
          </div>
          <div className="stat-label">Baisse moyenne du symptôme (T0→J21)</div>
        </div>
        <div className="stat-tile">
          <div className="stat-value">{m.openAlerts}</div>
          <div className="stat-label">Alertes ouvertes (réseau)</div>
        </div>
      </div>

      <div className="card">
        <h2>Complétude des questionnaires</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Questionnaire</th>
                <th>Attendus</th>
                <th>Complétés</th>
                <th>Taux</th>
              </tr>
            </thead>
            <tbody>
              {m.completion.map((c) => (
                <tr key={c.kind}>
                  <td>{FORM_KIND_LABELS[c.kind]}</td>
                  <td>{c.expected}</td>
                  <td>{c.completed}</td>
                  <td>{c.expected > 0 ? `${Math.round((c.completed / c.expected) * 100)} %` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>Tolérance et vigilance</h2>
        <div className="table-wrap">
          <table>
            <tbody>
              <tr>
                <td>Épisodes avec réaction rapportée à J2</td>
                <td>
                  <strong>{pct(m.reactionRate)}</strong>
                </td>
              </tr>
              <tr>
                <td>Réactions persistantes au-delà de 72 h</td>
                <td>
                  <strong>{pct(m.reactionOver72hRate)}</strong>
                </td>
              </tr>
              <tr>
                <td>Signes d&apos;alerte au questionnaire initial</td>
                <td>
                  <strong>{pct(m.redFlagRate)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>Répartition et résultats par indication</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Indication</th>
                <th>Épisodes</th>
                <th>Bilans J21 (n)</th>
                <th>Amélioration ressentie</th>
              </tr>
            </thead>
            <tbody>
              {m.indicationDistribution.map((d) => {
                const outcome = m.outcomeByIndication.find((o) => o.indication === d.indication);
                return (
                  <tr key={d.indication}>
                    <td>{d.indication}</td>
                    <td>{d.count ?? `< ${MIN_CELL_SIZE}`}</td>
                    <td>{outcome?.n ?? `< ${MIN_CELL_SIZE}`}</td>
                    <td>{pct(outcome?.improvementRate ?? null)}</td>
                  </tr>
                );
              })}
              {m.indicationDistribution.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted">
                    Aucune donnée pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>Export agrégé</h2>
        <p className="muted">
          Export CSV des indicateurs agrégés ci-dessus (sans identifiant direct, cellules
          minimales appliquées). Chaque export est journalisé (PRI-06).
        </p>
        <a className="btn btn-secondary" href="/api/admin/export">
          Télécharger l&apos;export agrégé (CSV)
        </a>
      </div>
    </>
  );
}
