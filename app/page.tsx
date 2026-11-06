import Link from "next/link";
import Brand from "@/components/Brand";

const milestones = [
  ["Aujourd’hui", "Votre situation et votre ressenti initial"],
  ["À 48 heures", "Votre évolution et les réactions ressenties"],
  ["À 3 semaines", "Le bilan de votre évolution"],
];

export default function Home() {
  return (
    <div className="rop-surface home-page">
      <a className="skip-link" href="#contenu">Aller au contenu</a>
      <header className="public-header">
        <Brand />
        <nav aria-label="Accès aux espaces" className="public-nav">
          <Link href="/praticien" className="btn btn-secondary">Espace praticien <span aria-hidden="true">↗</span></Link>
          <Link href="/admin" className="quiet-link">Administration</Link>
        </nav>
      </header>
      <main id="contenu" className="home-main">
        <section className="home-hero" aria-labelledby="home-title">
          <div className="home-intro">
            <p className="eyebrow">Votre suivi commence ici</p>
            <h1 id="home-title">Votre ressenti,<br /><em>au fil des jours.</em></h1>
            <p className="home-lead">Quelques questions pour partager votre vécu et préparer votre suivi avec votre praticien.</p>
            <a href="#mon-suivi" className="btn home-cta">Commencer mon suivi <span aria-hidden="true">→</span></a>
            <p className="home-caption">Environ 3 minutes · Aucun compte à créer</p>
          </div>
          <div className="journey-card">
            <p className="eyebrow">Trois rendez-vous avec vous</p>
            <h2>Un point de départ.<br />Un suivi dans le temps.</h2>
            <ol className="journey-list">
              {milestones.map(([title, description], i) => (
                <li key={title}>
                  <span className={`journey-number ${i === 0 ? "is-first" : ""}`} aria-hidden="true">{i + 1}</span>
                  <div><strong>{title}</strong><p>{description}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>
        <div className="home-reassurance">
          <p>Vos réponses sont accessibles à votre praticien.</p>
          <p>Un lien personnel. Un suivi qui vous appartient.</p>
        </div>
        <section id="mon-suivi" className="home-access" aria-labelledby="access-title">
          <div>
            <p className="eyebrow">Vous êtes patient</p>
            <h2 id="access-title">Votre lien, votre point de départ.</h2>
            <p>Ouvrez le lien ou scannez le QR code remis par votre praticien pour retrouver votre questionnaire personnel. Si vous ne l’avez plus, demandez-lui de vous le transmettre à nouveau.</p>
          </div>
          <div className="home-discover">
            <h3>Envie de découvrir le questionnaire ?</h3>
            <p>Un aperçu pour vous familiariser avec les questions, sans enregistrer de réponses.</p>
            <Link href="/questionnaires/apercu" className="text-link">Découvrir le questionnaire <span aria-hidden="true">→</span></Link>
          </div>
        </section>
      </main>
      <footer className="public-footer">
        <span>Institut R.O.P. · Suivi Patient</span>
        <p>Ce suivi ne remplace pas un avis médical. En cas d’urgence, contactez le 15 ou le 112.</p>
      </footer>
    </div>
  );
}
