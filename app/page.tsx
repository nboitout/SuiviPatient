import Link from "next/link";

export default function Home() {
  return (
    <main className="container">
      <div style={{ textAlign: "center", padding: "56px 0 28px" }}>
        <p
          className="lbl g"
          style={{ justifyContent: "center", marginBottom: 14 }}
        >
          Institut R.O.P.
        </p>
        <h1 style={{ fontSize: "2.4rem", marginTop: 0 }}>
          Suivi patient <em>R.O.P.</em>
        </h1>
        <p className="muted" style={{ maxWidth: 460, margin: "10px auto 0" }}>
          Suivi de l&apos;évolution ressentie après séance ROP — questionnaires courts et
          sécurisés, sans installation, réservés aux praticiens certifiés participants.
        </p>
      </div>

      <div className="card">
        <p className="lbl">Patients</p>
        <h2 style={{ marginTop: 0 }}>Vous êtes patient ?</h2>
        <p className="muted">
          Utilisez le lien ou le QR code remis par votre praticien pour accéder à votre
          questionnaire. Aucun compte n&apos;est nécessaire.
        </p>
      </div>

      <div className="card">
        <p className="lbl">Praticiens certifiés</p>
        <h2 style={{ marginTop: 0 }}>Vous êtes praticien ?</h2>
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
