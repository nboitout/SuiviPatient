import { findEpisodeByToken, currentOpenTask, FORM_KIND_LABELS } from "@/lib/episodes";
import { FORMS } from "@/lib/questionnaires";
import PatientFlow from "@/components/PatientFlow";

// Page patient : résout le lien sécurisé et présente le bon questionnaire.
// Aucun compte patient — le jeton haute entropie est la seule clé (PAT-01).

export default async function PatientPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const episode = await findEpisodeByToken(token);

  if (!episode) {
    return (
      <main className="container">
        <div className="card" style={{ marginTop: 40 }}>
          <h1>Lien invalide ou expiré</h1>
          <p>
            Ce lien de suivi n&apos;est plus valide. Si vous pensez qu&apos;il s&apos;agit
            d&apos;une erreur, contactez votre praticien qui pourra vous générer un nouveau
            lien.
          </p>
        </div>
      </main>
    );
  }

  const completedKinds = episode.responses.map((r) => r.kind as string);
  const task = currentOpenTask(episode.formTasks, completedKinds);

  if (!task) {
    // Rien à remplir maintenant : afficher la prochaine échéance
    const order = ["T0", "D2", "D21"];
    const next = episode.formTasks
      .filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELLED" && !completedKinds.includes(t.kind))
      .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))[0];
    return (
      <main className="container">
        <div className="card" style={{ marginTop: 40 }}>
          <h1>Merci !</h1>
          {next ? (
            <p>
              Vous avez répondu à tous les questionnaires disponibles pour le moment. Le
              prochain — {FORM_KIND_LABELS[next.kind]} — sera accessible à partir du{" "}
              <strong>{next.openFrom.toLocaleDateString("fr-FR")}</strong> via ce même lien.
            </p>
          ) : (
            <p>Votre suivi est complet. Merci pour votre participation.</p>
          )}
          <p className="muted">
            Ce questionnaire ne remplace pas un avis médical. En cas de symptômes sévères,
            inhabituels ou inquiétants, contactez un médecin ou le 15 (SAMU).
          </p>
        </div>
      </main>
    );
  }

  const form = FORMS[task.kind];
  const hasOutcomesConsent = episode.consents.some(
    (c) => c.type === "OUTCOMES_MONITORING" && c.granted && !c.withdrawnAt
  );

  return (
    <main className="container">
      <PatientFlow
        token={token}
        form={JSON.parse(JSON.stringify(form))}
        needsConsent={!hasOutcomesConsent}
        hasContact={Boolean(episode.contact?.email || episode.contact?.phone)}
      />
    </main>
  );
}
