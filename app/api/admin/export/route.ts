import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { computeNetworkMetrics, MIN_CELL_SIZE } from "@/lib/aggregate";

// Export agrégé (ADM-07 / PRI-06) : réservé aux admins, journalisé,
// sans identifiant direct, règles de cellules minimales appliquées.

export async function GET() {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const m = await computeNetworkMetrics();
  const suppressed = `<${MIN_CELL_SIZE}`;

  const lines: string[] = [];
  lines.push("indicateur;valeur");
  lines.push(`episodes_total;${m.episodeCount}`);
  lines.push(`praticiens_total;${m.practitionerCount}`);
  for (const c of m.completion) {
    lines.push(`completion_${c.kind}_attendus;${c.expected}`);
    lines.push(`completion_${c.kind}_completes;${c.completed}`);
  }
  lines.push(`taux_amelioration_J21;${m.d21ImprovementRate ?? suppressed}`);
  lines.push(`baisse_moyenne_symptome_T0_J21;${m.meanSymptomChange?.toFixed(2) ?? suppressed}`);
  lines.push(`taux_reaction_J2;${m.reactionRate ?? suppressed}`);
  lines.push(`taux_reaction_sup72h;${m.reactionOver72hRate ?? suppressed}`);
  lines.push(`taux_signes_alerte_T0;${m.redFlagRate ?? suppressed}`);
  lines.push("");
  lines.push("indication;episodes;bilans_J21;taux_amelioration");
  for (const d of m.indicationDistribution) {
    const o = m.outcomeByIndication.find((x) => x.indication === d.indication);
    lines.push(
      `${d.indication};${d.count ?? suppressed};${o?.n ?? suppressed};${o?.improvementRate ?? suppressed}`
    );
  }
  const csv = lines.join("\n");

  await logAudit(admin.id, "EXPORT_AGGREGATED", {
    objectType: "Export",
    detail: `csv agrégé, ${csv.length} octets`,
  });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="export-agrege-rop.csv"`,
    },
  });
}
