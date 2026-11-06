import { prisma } from "@/lib/db";
import { requireAdminPage as requireAdmin } from "@/lib/admin-access";
import type { CertificationStatus } from "@prisma/client";
import Link from "next/link";
import CreatePractitionerForm from "@/components/CreatePractitionerForm";
import PractitionerStatusSelect from "@/components/PractitionerStatusSelect";
import ResetPractitionerPassword from "@/components/ResetPractitionerPassword";
import {
  PRACTICE_SETTINGS,
  CERTIFICATION_LABELS,
  trainingsAtDate,
} from "@/lib/registry";

// Registre des praticiens (ADM-01) : invitation, activation, suspension.

export default async function PractitionersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; ajouter?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 120);
  const status = ["PENDING", "ACTIVE", "SUSPENDED", "REVOKED"].includes(params.status ?? "") ? params.status as CertificationStatus : undefined;

  const practitioners = await prisma.user.findMany({
    where: {
      role: "PRACTITIONER",
      ...(status ? { certificationStatus: status } : {}),
      ...(q ? { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { episodes: true, patients: true, treatmentSessions: true },
      },
      profileVersions: {
        orderBy: [
          { effectiveFrom: "desc" },
          { recordedAt: "desc" },
          { id: "desc" },
        ],
        take: 1,
      },
      certificationHistory: {
        orderBy: [{ effectiveFrom: "desc" }, { recordedAt: "desc" }],
      },
    },
  });

  return (
    <>
      <div className="page-heading"><div><p className="eyebrow">Les professionnels du réseau</p><h1>Accompagner vos praticiens.</h1><p className="muted">Retrouvez leurs comptes, leurs profils et leur statut de certification.</p></div><Link href="/admin/praticiens?ajouter=1#ajouter" className="btn">Ajouter un praticien +</Link></div>

      <details className="card invite-panel" id="ajouter" open={params.ajouter === "1"}><summary>Ajouter un praticien certifié</summary><div className="invite-form"><CreatePractitionerForm /></div></details>

      <div className="card">
        <h2>Registre ({practitioners.length})</h2>
        <form className="registry-toolbar" action="/admin/praticiens">
          <div><label htmlFor="practitioner-search">Nom ou adresse e-mail</label><input type="search" id="practitioner-search" name="q" defaultValue={q} placeholder="Rechercher un praticien…" /></div>
          <div><label htmlFor="practitioner-status">Certification</label><select id="practitioner-status" name="status" defaultValue={status ?? ""}><option value="">Tous les statuts</option>{Object.entries(CERTIFICATION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
          <button className="btn btn-secondary" type="submit">Filtrer</button>
          {(q || status) && <Link className="quiet-link" href="/admin/praticiens">Réinitialiser</Link>}
        </form>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>E-mail</th>
                <th>Protocole</th>
                <th>Profil professionnel</th>
                <th>Épisodes</th>
                <th>Statut de certification</th>
                <th>Mot de passe</th>
              </tr>
            </thead>
            <tbody>
              {practitioners.length === 0 && <tr><td colSpan={7} className="empty-state">{q || status ? "Aucun praticien ne correspond à ces critères." : "Aucun praticien pour le moment. Ajoutez le premier compte ci-dessus."}</td></tr>}
              {practitioners.map((p) => (
                <tr key={p.id}>
                  <td>{p.fullName}</td>
                  <td>{p.email}</td>
                  <td>
                    {p.protocolAcceptedAt ? (
                      <span className="badge badge-ok">
                        Accepté ({p.protocolVersion ?? "v1.0"})
                      </span>
                    ) : (
                      <span className="badge badge-neutral">Non accepté</span>
                    )}
                  </td>
                  <td>
                    {p.profileVersions[0] ? (
                      <details>
                        <summary>
                          {p.profileVersions[0].professionalBackground}
                        </summary>
                        <p>
                          {
                            PRACTICE_SETTINGS[
                              p.profileVersions[0]
                                .practiceSetting as keyof typeof PRACTICE_SETTINGS
                            ]
                          }{" "}
                          · ROP depuis {p.profileVersions[0].ropStartedYear}
                        </p>
                        <ul>
                          {trainingsAtDate(
                            p.profileVersions[0].trainings,
                            new Date(),
                          ).map((t, i) => (
                            <li key={i}>
                              {t.module} · {t.completedOn}
                              {t.provider ? ` · ${t.provider}` : ""}
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : (
                      <span className="muted">À compléter</span>
                    )}
                  </td>
                  <td>{p._count.episodes}</td>
                  <td>
                    <PractitionerStatusSelect
                      userId={p.id}
                      current={p.certificationStatus}
                    />
                    <details>
                      <summary>Historique</summary>
                      <ul>
                        {p.certificationHistory.map((event) => (
                          <li key={event.id}>
                            {event.effectiveFrom.toLocaleDateString("fr-FR", {
                              timeZone: "UTC",
                            })}{" "}
                            — {CERTIFICATION_LABELS[event.status]}
                          </li>
                        ))}
                      </ul>
                    </details>
                  </td>
                  <td>
                    <ResetPractitionerPassword userId={p.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
