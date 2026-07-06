import "server-only";
import { prisma } from "./db";
import { generateToken, hashToken } from "./tokens";
import type { Episode, FormTask } from "@prisma/client";

const LINK_VALIDITY_DAYS = 45; // couvre T0 → D21 + marge

export interface CreateEpisodeInput {
  practitionerId: string;
  sessionNumber: number;
  sessionDate: Date;
  mainIndication: string;
  ropFocus?: string;
  ageBand?: string;
  sex?: string;
  contactEmail?: string;
  contactPhone?: string;
}

// Crée un épisode + tâche T0 ouverte immédiatement.
// Retourne le jeton en clair (affiché une seule fois au praticien).
export async function createEpisode(input: CreateEpisodeInput): Promise<{ episode: Episode; token: string }> {
  const token = generateToken();
  const now = new Date();
  const episode = await prisma.episode.create({
    data: {
      tokenHash: hashToken(token),
      practitionerId: input.practitionerId,
      sessionNumber: input.sessionNumber,
      sessionDate: input.sessionDate,
      mainIndication: input.mainIndication,
      ropFocus: input.ropFocus || null,
      ageBand: input.ageBand || null,
      sex: input.sex || null,
      linkExpiresAt: new Date(now.getTime() + LINK_VALIDITY_DAYS * 86400 * 1000),
      formTasks: {
        create: [{ kind: "T0", dueAt: now, openFrom: now, status: "OPEN" }],
      },
      ...(input.contactEmail || input.contactPhone
        ? {
            contact: {
              create: {
                email: input.contactEmail || null,
                phone: input.contactPhone || null,
                contactConsent: false, // le consentement est donné par le patient lui-même
              },
            },
          }
        : {}),
    },
  });
  return { episode, token };
}

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
