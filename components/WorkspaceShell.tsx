import Brand from "@/components/Brand";
import WorkspaceNav from "@/components/WorkspaceNav";
import { logoutAction } from "@/app/praticien/actions";

export default function WorkspaceShell({ mode, fullName, children }: {
  mode: "admin" | "practitioner";
  fullName: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rop-surface workspace">
      <a className="skip-link" href="#workspace-content">Aller au contenu</a>
      <header className="workspace-header">
        <Brand />
        <div className="workspace-account">
          <span className="workspace-user">{fullName}</span>
          <form action={logoutAction}><button className="btn btn-secondary btn-small" type="submit">Déconnexion</button></form>
        </div>
      </header>
      <div className="workspace-layout">
        <aside className="workspace-sidebar">
          <p className="eyebrow">{mode === "admin" ? "Administration" : "Mon espace praticien"}</p>
          <WorkspaceNav mode={mode} />
          <div className="workspace-note">
            {mode === "admin" ? <><strong>Une vue sur le réseau.</strong><p>Praticiens, activité et tendances collectives, dans un même espace.</p></> : <><strong>Un espace personnel.</strong><p>Retrouvez les dossiers et les réponses de vos patients.</p></>}
          </div>
        </aside>
        <main id="workspace-content" className="workspace-content">{children}</main>
      </div>
    </div>
  );
}
