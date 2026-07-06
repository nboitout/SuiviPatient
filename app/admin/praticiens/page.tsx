import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import CreatePractitionerForm from "@/components/CreatePractitionerForm";
import PractitionerStatusSelect from "@/components/PractitionerStatusSelect";

// Registre des praticiens (ADM-01) : invitation, activation, suspension.

export default async function PractitionersPage() {
  await requireAdmin();

  const practitioners = await prisma.user.findMany({
    where: { role: "PRACTITIONER" },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { episodes: true } } },
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
                <th>Épisodes</th>
                <th>Statut de certification</th>
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
                  <td>{p._count.episodes}</td>
                  <td>
                    <PractitionerStatusSelect userId={p.id} current={p.certificationStatus} />
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
