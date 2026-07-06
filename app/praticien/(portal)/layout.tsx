import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { logoutAction, acceptProtocolAction } from "@/app/praticien/actions";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/praticien/login");

  const statusLabels: Record<string, string> = {
    PENDING: "En attente de validation",
    ACTIVE: "Certifié actif",
    SUSPENDED: "Suspendu",
    REVOKED: "Révoqué",
  };

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/praticien" className="topbar-brand">
            Suivi R.O.P.
          </Link>
          <nav aria-label="Navigation principale">
            <Link href="/praticien">Tableau de bord</Link>
            <Link href="/praticien/nouveau">Créer un suivi</Link>
            <Link href="/praticien/alertes">Alertes</Link>
          </nav>
          <span className="topbar-spacer" />
          <span className="muted">{user.fullName}</span>
          <form action={logoutAction}>
            <button className="btn btn-secondary btn-small" type="submit">
              Déconnexion
            </button>
          </form>
        </div>
      </header>
      <main className="container-wide">
        {user.certificationStatus !== "ACTIVE" && (
          <div className="notice notice-warning" role="alert">
            Statut de votre compte : <strong>{statusLabels[user.certificationStatus]}</strong>. La
            création de nouveaux suivis est désactivée.
          </div>
        )}
        {!user.protocolAcceptedAt && (
          <div className="card">
            <h2>Protocole de suivi ROP — acceptation requise</h2>
            <p className="muted">
              Avant votre première utilisation, vous devez accepter les règles de participation :
              informer le patient et recueillir son consentement, ne pas influencer ses réponses,
              examiner les alertes de signes d&apos;alerte et documenter l&apos;action appropriée,
              ne pas exporter ni réutiliser les données du registre en dehors de la finalité
              convenue, n&apos;accéder qu&apos;aux données de vos propres patients, et utiliser
              les résultats comme information de suivi — pas comme preuve d&apos;efficacité
              clinique.
            </p>
            <form action={acceptProtocolAction}>
              <button className="btn" type="submit">
                J&apos;accepte le protocole (v1.0)
              </button>
            </form>
          </div>
        )}
        {children}
      </main>
    </>
  );
}
