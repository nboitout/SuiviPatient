import { requireAdmin } from "@/lib/auth";
import ChangePasswordForm from "@/components/ChangePasswordForm";

export default async function AdminAccountPage() {
  const user = await requireAdmin();

  return (
    <>
      <h1>Mon compte</h1>
      <div className="card" style={{ maxWidth: 480 }}>
        <p className="muted">
          Connecté(e) en tant que <strong>{user.fullName}</strong> ({user.email})
        </p>
        <h2>Changer mon mot de passe</h2>
        <ChangePasswordForm />
      </div>
    </>
  );
}
