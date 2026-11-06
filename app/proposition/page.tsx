import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Proposition de design — Suivi Patient R.O.P.",
  robots: { index: false, follow: false },
};

export default function DesignProposalPage() {
  return (
    <main className="container-wide" style={{ paddingTop: 32 }}>
      <p><Link href="/">← Retour à l’accueil</Link></p>
      <p className="lbl">Proposition de design</p>
      <h1>Un suivi plus clair, pour les patients et les praticiens</h1>
      <p className="muted" style={{ maxWidth: 760 }}>
        Explorez le parcours patient sur ordinateur et mobile, puis l’espace
        personnel du praticien et l’observatoire du réseau.
      </p>
      <div className="notice notice-info">
        <strong>Maquettes interactives — données entièrement fictives.</strong>
        <p style={{ marginBottom: 0 }}>
          Ces propositions n’ouvrent aucun dossier réel et n’envoient aucune
          réponse. Elles illustrent le design et les parcours à valider.
        </p>
      </div>
      <div className="form-grid">
        <section className="card">
          <p className="lbl">Espace patient</p>
          <h2>Votre ressenti, au fil des jours</h2>
          <p>
            Accueil et consentement, questionnaire initial par étapes, puis
            suivi à 48 heures sur mobile. Utilisez le sélecteur en bas de la
            maquette pour passer entre Accueil, Bureau et Mobile.
          </p>
          <a className="btn" href="/propositions/patient.html">
            Explorer le parcours patient
          </a>
        </section>
        <section className="card">
          <p className="lbl">Espace praticien</p>
          <h2>Mes patients et observatoire ROP</h2>
          <p>
            Ouvrez un dossier fictif depuis Mes patients, puis explorez les
            statistiques collectives dans Observatoire ROP. Un groupe trop
            restreint montre un résultat non publié.
          </p>
          <a className="btn" href="/propositions/praticien.html">
            Explorer l’espace praticien
          </a>
        </section>
      </div>
      <p className="muted">
        L’accès aux dossiers réels reste dans le portail praticien. Les règles
        de partage et d’anonymisation présentées ici sont des exigences de la
        proposition, pas des fonctionnalités mises en production par ces maquettes.
      </p>
    </main>
  );
}
