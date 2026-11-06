import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { acceptProtocolAction } from "@/app/praticien/actions";
import WorkspaceShell from "@/components/WorkspaceShell";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/praticien/login");
  if (user.role === "ADMIN") redirect("/admin");

  const statusLabels: Record<string, string> = {
    PENDING: "En attente de validation",
    ACTIVE: "Certifié actif",
    SUSPENDED: "Suspendu",
    REVOKED: "Révoqué",
  };

  return (
    <WorkspaceShell mode="practitioner" fullName={user.fullName}>
        {user.certificationStatus !== "ACTIVE" && (
          <div className="notice notice-warning" role="alert">
            Statut de votre compte :{" "}
            <strong>{statusLabels[user.certificationStatus]}</strong>. La
            création de nouveaux suivis est désactivée.
          </div>
        )}
        {!user.protocolAcceptedAt && (
          <div className="card">
            <h2>Protocole de suivi ROP — acceptation requise</h2>
            <p className="muted">
              Avant votre première utilisation, vous devez accepter les règles
              de participation : informer le patient et recueillir son
              consentement, ne pas influencer ses réponses, examiner les alertes
              de signes d&apos;alerte et documenter l&apos;action appropriée, ne
              pas exporter ni réutiliser les données du registre en dehors de la
              finalité convenue, n&apos;accéder qu&apos;aux données de vos
              propres patients, et utiliser les résultats comme information de
              suivi — pas comme preuve d&apos;efficacité clinique.
            </p>
            <form action={acceptProtocolAction}>
              <button className="btn" type="submit">
                J&apos;accepte le protocole (v1.0)
              </button>
            </form>
          </div>
        )}
        {children}
    </WorkspaceShell>
  );
}
