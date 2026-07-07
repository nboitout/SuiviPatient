import LoginForm from "@/components/LoginForm";

export default async function PractitionerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ pw?: string }>;
}) {
  const { pw } = await searchParams;

  return (
    <main className="container" style={{ maxWidth: 420 }}>
      <div style={{ textAlign: "center", padding: "40px 0 8px" }}>
        <p className="lbl g" style={{ justifyContent: "center" }}>
          Institut R.O.P.
        </p>
        <h1>Portail praticien</h1>
        <p className="muted">Réservé aux praticiens certifiés participants.</p>
      </div>
      {pw === "changed" && (
        <p className="notice notice-ok" role="status">
          Mot de passe modifié. Reconnectez-vous avec votre nouveau mot de passe.
        </p>
      )}
      <div className="card">
        <LoginForm />
      </div>
    </main>
  );
}
