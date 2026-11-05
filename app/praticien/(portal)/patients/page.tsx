import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePractitioner } from "@/lib/auth";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requirePractitioner();
  const { q = "" } = await searchParams;
  const query = q.trim().slice(0, 80);
  const patients = await prisma.patient.findMany({
    where: {
      practitionerId: user.id,
      episodes: { some: {} },
      ...(query ? { code: { contains: query, mode: "insensitive" } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      episodes: {
        select: {
          id: true,
          status: true,
          treatmentSessions: { select: { performedAt: true } },
        },
      },
    },
  });
  return (
    <>
      <div className="action-row">
        <h1>Mes patients</h1>
        <Link className="btn" href="/praticien/nouveau">
          Créer un épisode
        </Link>
      </div>
      <p className="muted">
        Un code stable pour retrouver les épisodes et les séances d’un même
        patient. Conservez son identité dans votre dossier local.
      </p>
      <form className="card action-row">
        <div className="field" style={{ marginBottom: 0, flex: 1 }}>
          <label htmlFor="patient-search">Rechercher un code patient</label>
          <input
            id="patient-search"
            name="q"
            defaultValue={query}
            maxLength={80}
          />
        </div>
        <button className="btn btn-secondary">Rechercher</button>
      </form>
      <div className="card">
        <h2>
          {patients.length} dossier{patients.length > 1 ? "s" : ""}
        </h2>
        {patients.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Code patient</th>
                  <th>Tranche d’âge</th>
                  <th>Épisodes</th>
                  <th>Séances</th>
                  <th>Dernière séance</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => {
                  const sessions = p.episodes.flatMap(
                    (e) => e.treatmentSessions,
                  );
                  const latest = sessions.reduce<Date | null>(
                    (last, s) =>
                      !last || s.performedAt > last ? s.performedAt : last,
                    null,
                  );
                  return (
                    <tr key={p.id}>
                      <td>
                        <Link
                          className="patient-code"
                          href={`/praticien/patient/${p.id}`}
                        >
                          {p.code}
                        </Link>
                      </td>
                      <td>{p.ageBand ?? "—"}</td>
                      <td>{p.episodes.length}</td>
                      <td>{sessions.length}</td>
                      <td>
                        {latest?.toLocaleDateString("fr-FR", {
                          timeZone: "UTC",
                        }) ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">
            Aucun dossier pour cette recherche. Créez un premier épisode pour
            enregistrer un patient.
          </p>
        )}
      </div>
    </>
  );
}
