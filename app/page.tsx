import Link from "next/link";

export default function Home() {
  return (
    <main className="container">
      <div style={{ textAlign: "center", padding: "48px 0 24px" }}>
        <h1 style={{ fontSize: "1.8rem" }}>Suivi Patient ROP</h1>
        <p className="muted" style={{ maxWidth: 460, margin: "0 auto" }}>
          Suivi de l&apos;évolution ressentie après séance ROP — questionnaires courts et
          sécurisés, sans installation, réservés aux praticiens certifiés participants.
        </p>
      </div>

      <div className="card">
        <h2>Vous êtes patient ?</h2>
        <p className="muted">
          Utilisez le lien ou le QR code remis par votre praticien pour accéder à votre
          questionnaire. Aucun compte n&apos;est nécessaire.
        </p>
      </div>

      <div className="card">
        <h2>Vous êtes praticien certifié ?</h2>
        <p className="muted">Accédez à votre portail de suivi.</p>
        <Link href="/praticien/login" className="btn">
          Portail praticien
        </Link>
      </div>

      <p className="muted" style={{ textAlign: "center" }}>
        Ce service ne remplace pas un avis médical. En cas d&apos;urgence, contactez le 15
        (SAMU) ou le 112.
      </p>
    </main>
  );
}
