import Link from "next/link";
import Brand from "@/components/Brand";
import LoginForm from "@/components/LoginForm";

export default function ProfessionalLogin({ mode, passwordChanged = false }: {
  mode: "admin" | "practitioner";
  passwordChanged?: boolean;
}) {
  const admin = mode === "admin";
  return (
    <div className="rop-surface login-page">
      <header className="public-header"><Brand /><span className="eyebrow">{admin ? "Administration" : "Espace praticien"}</span></header>
      <main className="login-main">
        <section className="login-panel" aria-labelledby="login-title">
          <p className="eyebrow">{admin ? "Accès réservé à l’institut" : "Votre espace personnel"}</p>
          <h1 id="login-title">Heureux de vous retrouver.</h1>
          <p className="muted">{admin ? "Pilotez le réseau, accompagnez les praticiens et retrouvez les résultats du suivi." : "Retrouvez vos patients, leurs réponses et leur évolution au fil des séances."}</p>
          {passwordChanged && <p className="notice notice-ok" role="status">Mot de passe modifié. Reconnectez-vous avec votre nouveau mot de passe.</p>}
          <LoginForm mode={mode} />
          <p className="login-help">{admin ? "Utilisez votre compte administrateur de l’Institut R.O.P." : "L’Institut R.O.P. vous remet vos identifiants lors de votre inscription au réseau."}</p>
        </section>
        <Link className="quiet-link" href={admin ? "/praticien/login" : "/admin/login"}>{admin ? "Vous êtes praticien ? Accéder à votre espace" : "Vous administrez le réseau ? Accès institut"}</Link>
      </main>
      <footer className="public-footer"><span>Institut R.O.P. · {admin ? "Administration" : "Praticiens"}</span><Link href="/">Retour à l’accueil <span aria-hidden="true">↗</span></Link></footer>
    </div>
  );
}
