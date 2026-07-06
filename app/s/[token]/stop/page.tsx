import { findEpisodeByToken } from "@/lib/episodes";
import OptOutForm from "@/components/OptOutForm";

// Désinscription des rappels (PAT-08, REM-06) : arrêt immédiat des rappels,
// les données déjà collectées restent conservées selon la politique de rétention.

export default async function StopPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const episode = await findEpisodeByToken(token);

  return (
    <main className="container">
      <div className="card" style={{ marginTop: 40 }}>
        <h1>Arrêter les rappels</h1>
        {!episode ? (
          <p>Ce lien n&apos;est plus valide.</p>
        ) : episode.contact?.optedOutAt ? (
          <p className="notice notice-ok">Vous ne recevez plus de rappels pour ce suivi.</p>
        ) : (
          <OptOutForm token={token} />
        )}
        <p className="muted">
          L&apos;arrêt des rappels n&apos;efface pas les réponses déjà enregistrées. Pour
          exercer vos droits (accès, rectification, effacement), contactez votre praticien ou
          l&apos;institut ROP.
        </p>
      </div>
    </main>
  );
}
