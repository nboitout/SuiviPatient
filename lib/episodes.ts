import "server-only";
import { prisma } from "./db";
import { hashToken } from "./tokens";
import type { FormTask } from "@prisma/client";

export async function findEpisodeByToken(token: string) {
  const episode = await prisma.episode.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      formTasks: { orderBy: { dueAt: "asc" } },
      consents: true,
      contact: true,
      responses: { select: { kind: true } },
    },
  });
  if (!episode) return null;
  if (episode.status === "REVOKED") return null;
  if (episode.linkExpiresAt < new Date()) return null;
  return episode;
}

// Après soumission du T0 : planifie D2 (48 h) et D21 (21 j) + rappels
// si le patient a consenti au contact (4.3, REM-01/02).
export async function scheduleFollowUps(episodeId: string, baselineDate: Date): Promise<void> {
  const d2Due = new Date(baselineDate.getTime() + 2 * 86400 * 1000);
  const d21Due = new Date(baselineDate.getTime() + 21 * 86400 * 1000);
  // ouverture : D2 dès 24 h, D21 dès 14 j (fenêtre d'intégration)
  const d2Open = new Date(baselineDate.getTime() + 1 * 86400 * 1000);
  const d21Open = new Date(baselineDate.getTime() + 14 * 86400 * 1000);

  await prisma.formTask.createMany({
    data: [
      { episodeId, kind: "D2", dueAt: d2Due, openFrom: d2Open, status: "SCHEDULED" },
      { episodeId, kind: "D21", dueAt: d21Due, openFrom: d21Open, status: "SCHEDULED" },
    ],
  });

  const contact = await prisma.patientContact.findUnique({ where: { episodeId } });
  if (contact?.contactConsent && !contact.optedOutAt && (contact.email || contact.phone)) {
    const channel = contact.email ? "email" : "sms";
    await prisma.reminderTask.createMany({
      data: [
        { episodeId, formKind: "D2", channel, dueAt: d2Due },
        { episodeId, formKind: "D21", channel, dueAt: d21Due },
      ],
    });
  }
}

// Détermine quel formulaire présenter au patient qui ouvre son lien.
export function currentOpenTask(tasks: FormTask[], completedKinds: string[]): FormTask | null {
  const now = new Date();
  const order = ["T0", "D2", "D21"];
  const pending = tasks
    .filter(
      (t) =>
        (t.status === "OPEN" || t.status === "SCHEDULED") &&
        !completedKinds.includes(t.kind) &&
        t.openFrom <= now
    )
    .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  return pending[0] ?? null;
}

export const INDICATION_LABELS: Record<string, string> = {
  douleur_mobilite: "Douleur / mobilité",
  digestif: "Confort digestif",
  stress_anxiete: "Stress / anxiété",
  sommeil: "Sommeil",
  fatigue: "Fatigue",
  pelvien_urogenital: "Pelvien / uro-génital",
  post_trauma_chirurgie: "Post-trauma / post-chirurgie",
  autre: "Autre",
};

export const FORM_KIND_LABELS: Record<string, string> = {
  T0: "Questionnaire initial (T0)",
  SAME_DAY: "Jour même",
  D2: "Suivi 48 h (J2)",
  D7: "Suivi J7",
  D21: "Bilan 3 semaines (J21)",
};
