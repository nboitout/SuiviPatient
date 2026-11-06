"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminLinks = [
  ["/admin", "Vue d’ensemble", "01"],
  ["/admin/praticiens", "Praticiens", "02"],
  ["/admin/observatoire", "Observatoire", "03"],
  ["/admin/audit", "Journal d’audit", "04"],
  ["/admin/compte", "Mon compte", "05"],
];
const practitionerLinks = [
  ["/praticien", "Vue d’ensemble", "01"],
  ["/praticien/patients", "Mes patients", "02"],
  ["/praticien/nouveau", "Créer un suivi", "03"],
  ["/praticien/alertes", "Alertes", "04"],
  ["/praticien/compte", "Mon compte", "05"],
];

export default function WorkspaceNav({ mode }: { mode: "admin" | "practitioner" }) {
  const pathname = usePathname();
  const links = mode === "admin" ? adminLinks : practitionerLinks;
  return (
    <nav className="workspace-nav" aria-label={mode === "admin" ? "Navigation administration" : "Navigation praticien"}>
      {links.map(([href, label, number], i) => {
        const patientDetail = mode === "practitioner" && href === "/praticien/patients" && /^\/praticien\/(patient|episode)\//.test(pathname);
        const active = pathname === href || (i > 0 && pathname.startsWith(`${href}/`)) || patientDetail;
        return <Link key={href} href={href} aria-current={active ? "page" : undefined}><span aria-hidden="true">{number}</span>{label}</Link>;
      })}
    </nav>
  );
}
