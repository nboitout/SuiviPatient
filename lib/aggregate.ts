import "server-only";
import { prisma } from "./db";
import { INDICATION_LABELS } from "./episodes";

// Métriques agrégées du réseau (spécifications section 8.2).
// Règle de taille de cellule minimale (8.3 / ADM-07) : toute cellule
// portant sur moins de MIN_CELL_SIZE épisodes est supprimée des vues
// et exports pour réduire le risque de ré-identification.

export const MIN_CELL_SIZE = 5;

const IMPROVED = ["beaucoup_mieux", "mieux"];

export interface NetworkMetrics {
  episodeCount: number;
  practitionerCount: number;
  completion: { kind: string; expected: number; completed: number }[];
  d21ImprovementRate: number | null;
  meanSymptomChange: number | null;
  reactionRate: number | null;
  reactionOver72hRate: number | null;
  redFlagRate: number | null;
  openAlerts: number;
  indicationDistribution: { indication: string; count: number | null }[];
  outcomeByIndication: { indication: string; n: number | null; improvementRate: number | null }[];
}

export async function computeNetworkMetrics(): Promise<NetworkMetrics> {
  const [episodeCount, practitionerCount, openAlerts, tasks, responses, episodes] =
    await Promise.all([
      prisma.episode.count(),
      prisma.user.count({ where: { role: "PRACTITIONER" } }),
      prisma.alert.count({ where: { status: { in: ["NEW", "ACKNOWLEDGED"] } } }),
      prisma.formTask.groupBy({ by: ["kind", "status"], _count: true }),
      prisma.questionnaireResponse.findMany({
        select: { kind: true, answers: true, episodeId: true },
      }),
      prisma.episode.findMany({ select: { id: true, mainIndication: true } }),
    ]);

  const completion = ["T0", "D2", "D21"].map((kind) => {
    const rows = tasks.filter((t) => t.kind === kind);
    const expected = rows.reduce((s, r) => s + r._count, 0);
    const completed = rows.filter((r) => r.status === "COMPLETED").reduce((s, r) => s + r._count, 0);
    return { kind, expected, completed };
  });

  const parsed = responses.map((r) => ({
    kind: r.kind,
    episodeId: r.episodeId,
    answers: JSON.parse(r.answers) as Record<string, unknown>,
  }));

  const t0 = parsed.filter((r) => r.kind === "T0");
  const d2 = parsed.filter((r) => r.kind === "D2");
  const d21 = parsed.filter((r) => r.kind === "D21");

  const d21ImprovementRate =
    d21.length >= MIN_CELL_SIZE
      ? d21.filter((r) => IMPROVED.includes(String(r.answers.global_change))).length / d21.length
      : null;

  // Variation moyenne du symptôme principal T0 → J21
  const pairs = d21
    .map((r) => {
      const base = t0.find((b) => b.episodeId === r.episodeId);
      if (!base) return null;
      const before = Number(base.answers.symptom_intensity);
      const after = Number(r.answers.symptom_intensity);
      if (Number.isNaN(before) || Number.isNaN(after)) return null;
      return before - after;
    })
    .filter((x): x is number => x !== null);
  const meanSymptomChange =
    pairs.length >= MIN_CELL_SIZE ? pairs.reduce((a, b) => a + b, 0) / pairs.length : null;

  const reactionRate =
    d2.length >= MIN_CELL_SIZE
      ? d2.filter((r) => {
          const reactions = r.answers.reactions;
          return Array.isArray(reactions) && reactions.some((x) => x !== "aucune");
        }).length / d2.length
      : null;

  const reactionOver72hRate =
    d2.length >= MIN_CELL_SIZE
      ? d2.filter((r) => ["oui", "en_cours"].includes(String(r.answers.reaction_over_72h))).length /
        d2.length
      : null;

  const redFlagRate =
    t0.length >= MIN_CELL_SIZE
      ? t0.filter((r) => {
          const flags = r.answers.safety_screen;
          return Array.isArray(flags) && flags.some((x) => x !== "aucun");
        }).length / t0.length
      : null;

  // Répartition par indication, cellules < MIN_CELL_SIZE supprimées
  const byIndication = new Map<string, string[]>();
  for (const e of episodes) {
    const list = byIndication.get(e.mainIndication) ?? [];
    list.push(e.id);
    byIndication.set(e.mainIndication, list);
  }
  const indicationDistribution = [...byIndication.entries()].map(([indication, ids]) => ({
    indication: INDICATION_LABELS[indication] ?? indication,
    count: ids.length >= MIN_CELL_SIZE ? ids.length : null,
  }));

  const outcomeByIndication = [...byIndication.entries()].map(([indication, ids]) => {
    const rows = d21.filter((r) => ids.includes(r.episodeId));
    if (rows.length < MIN_CELL_SIZE) {
      return { indication: INDICATION_LABELS[indication] ?? indication, n: null, improvementRate: null };
    }
    return {
      indication: INDICATION_LABELS[indication] ?? indication,
      n: rows.length,
      improvementRate:
        rows.filter((r) => IMPROVED.includes(String(r.answers.global_change))).length / rows.length,
    };
  });

  return {
    episodeCount,
    practitionerCount,
    completion,
    d21ImprovementRate,
    meanSymptomChange,
    reactionRate,
    reactionOver72hRate,
    redFlagRate,
    openAlerts,
    indicationDistribution,
    outcomeByIndication,
  };
}
