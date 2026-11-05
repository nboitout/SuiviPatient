import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import CreatePractitionerForm from "@/components/CreatePractitionerForm";
import PractitionerStatusSelect from "@/components/PractitionerStatusSelect";
import ResetPractitionerPassword from "@/components/ResetPractitionerPassword";
import {
  PRACTICE_SETTINGS,
  CERTIFICATION_LABELS,
  trainingsAtDate,
} from "@/lib/registry";

// Registre des praticiens (ADM-01) : invitation, activation, suspension.

export default async function PractitionersPage() {
  await requireAdmin();

  const practitioners = await prisma.user.findMany({
    where: { role: "PRACTITIONER" },
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
      <h1>Praticiens</h1>

      <div className="card" style={{ maxWidth: 560 }}>
        <h2>Ajouter un praticien certifié</h2>
        <CreatePractitionerForm />
      </div>

      <div className="card">
        <h2>Registre ({practitioners.length})</h2>
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
