import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// Journal d'audit (ADM-09) : connexions, consultations, exports,
// actions sur alertes et modifications.

export default async function AuditPage() {
  await requireAdmin();

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { fullName: true, email: true } } },
  });

  return (
    <>
      <h1>Journal d&apos;audit</h1>
      <p className="muted">200 dernières entrées.</p>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Horodatage</th>
                <th>Utilisateur</th>
                <th>Action</th>
                <th>Objet</th>
                <th>Détail</th>
                <th>Résultat</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{l.createdAt.toLocaleString("fr-FR")}</td>
                  <td>{l.user ? l.user.fullName : "—"}</td>
                  <td>{l.action}</td>
                  <td className="muted">
                    {l.objectType ? `${l.objectType} ${l.objectId?.slice(0, 8) ?? ""}` : "—"}
                  </td>
                  <td className="muted">{l.detail ?? "—"}</td>
                  <td>
                    <span className={`badge ${l.outcome === "OK" ? "badge-ok" : "badge-high"}`}>
                      {l.outcome}
                    </span>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    Aucune entrée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
