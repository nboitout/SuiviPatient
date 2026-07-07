import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { logoutAction } from "@/app/praticien/actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/praticien/login");
  if (user.role !== "ADMIN") redirect("/praticien");

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/admin" className="topbar-brand">
            Suivi R.O.P. — Institut
          </Link>
          <nav aria-label="Navigation administration">
            <Link href="/admin">Réseau</Link>
            <Link href="/admin/praticiens">Praticiens</Link>
            <Link href="/admin/audit">Journal d&apos;audit</Link>
            <Link href="/admin/compte">Mon compte</Link>
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
      <main className="container-wide">{children}</main>
    </>
  );
}
