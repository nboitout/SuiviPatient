// Données de démonstration pour le développement et la revue produit.
// NE PAS exécuter en production.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";

const prisma = new PrismaClient();

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const DAY = 86400 * 1000;

async function main() {
  const password = await bcrypt.hash("demo1234", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@rop-institut.fr" },
    update: {},
    create: {
      email: "admin@rop-institut.fr",
      fullName: "Institut ROP (admin)",
      passwordHash: password,
      role: "ADMIN",
      certificationStatus: "ACTIVE",
      protocolAcceptedAt: new Date(),
      protocolVersion: "protocole-v1.0",
    },
  });

  const practitioner = await prisma.user.upsert({
    where: { email: "praticien@exemple.fr" },
    update: {},
    create: {
      email: "praticien@exemple.fr",
      fullName: "Dr Exemple Praticien",
      passwordHash: password,
      role: "PRACTITIONER",
      certificationStatus: "ACTIVE",
      protocolAcceptedAt: new Date(),
      protocolVersion: "protocole-v1.0",
    },
  });

  console.log("Comptes de démo :");
  console.log("  Admin      : admin@rop-institut.fr / demo1234");
  console.log("  Praticien  : praticien@exemple.fr / demo1234");

  if ((await prisma.episode.count()) > 0) {
    console.log("Des épisodes existent déjà — pas de données de démo supplémentaires.");
    return;
  }

  const indications = [
    "douleur_mobilite",
    "digestif",
    "stress_anxiete",
    "sommeil",
    "douleur_mobilite",
    "douleur_mobilite",
    "digestif",
    "stress_anxiete",
  ];
  const changes = [
    "beaucoup_mieux",
    "mieux",
    "mieux",
    "un_peu_mieux",
    "inchange",
    "mieux",
    "beaucoup_mieux",
    "un_peu_pire",
  ];

  for (let i = 0; i < indications.length; i++) {
    const baseDate = new Date(Date.now() - (30 - i) * DAY);
    const token = randomBytes(24).toString("base64url");
    const episode = await prisma.episode.create({
      data: {
        tokenHash: hashToken(token),
        practitionerId: practitioner.id,
        sessionNumber: 1,
        sessionDate: baseDate,
        mainIndication: indications[i],
        ageBand: ["31-45", "46-60", "61-75"][i % 3],
        linkExpiresAt: new Date(Date.now() + 45 * DAY),
        status: i < 6 ? "COMPLETED" : "ACTIVE",
      },
    });

    await prisma.consentRecord.createMany({
      data: [
        { episodeId: episode.id, type: "OUTCOMES_MONITORING", version: "v1.0", granted: true },
        { episodeId: episode.id, type: "AGGREGATED_RESEARCH", version: "v1.0", granted: i % 2 === 0 },
      ],
    });

    const t0Symptom = 6 + (i % 3);
    const t0Task = await prisma.formTask.create({
      data: { episodeId: episode.id, kind: "T0", dueAt: baseDate, openFrom: baseDate, status: "COMPLETED" },
    });
    await prisma.questionnaireResponse.create({
      data: {
        episodeId: episode.id,
        formTaskId: t0Task.id,
        kind: "T0",
        questionnaireVersion: "v1.0",
        submittedAt: baseDate,
        answers: JSON.stringify({
          main_reason: indications[i],
          symptom_duration: "3_12m",
          symptom_intensity: t0Symptom,
          daily_limitation: 5 + (i % 3),
          sleep: 4,
          energy: 4,
          stress: 6,
          medical_followup: i % 2 === 0 ? "oui" : "non",
          safety_screen: i === 7 ? ["douleur_nocturne"] : ["aucun"],
        }),
      },
    });
    if (i === 7) {
      await prisma.alert.create({
        data: {
          episodeId: episode.id,
          type: "BASELINE_RED_FLAG",
          severity: "HIGH",
          detail: "Signes d'alerte cochés : douleur_nocturne",
        },
      });
    }

    // D2
    const d2Date = new Date(baseDate.getTime() + 2 * DAY);
    const d2Task = await prisma.formTask.create({
      data: {
        episodeId: episode.id,
        kind: "D2",
        dueAt: d2Date,
        openFrom: new Date(baseDate.getTime() + DAY),
        status: i < 7 ? "COMPLETED" : "SCHEDULED",
      },
    });
    if (i < 7) {
      const over72h = i === 5;
      await prisma.questionnaireResponse.create({
        data: {
          episodeId: episode.id,
          formTaskId: d2Task.id,
          kind: "D2",
          questionnaireVersion: "v1.0",
          submittedAt: d2Date,
          answers: JSON.stringify({
            symptom_change: i === 4 ? "inchange" : "un_peu_mieux",
            reactions: i % 2 === 0 ? ["fatigue", "repos"] : ["aucune"],
            reaction_intensity: i % 2 === 0 ? 4 : null,
            reaction_over_72h: over72h ? "oui" : "non",
            medical_advice_needed: "non",
          }),
        },
      });
      if (over72h) {
        await prisma.alert.create({
          data: {
            episodeId: episode.id,
            type: "REACTION_OVER_72H",
            severity: "MEDIUM",
            detail: "Réaction persistante au-delà de 72 h.",
            status: "PATIENT_CONTACTED",
            reviewedAt: new Date(d2Date.getTime() + DAY),
            reviewerId: practitioner.id,
          },
        });
      }
    }

    // D21
    const d21Date = new Date(baseDate.getTime() + 21 * DAY);
    const d21Task = await prisma.formTask.create({
      data: {
        episodeId: episode.id,
        kind: "D21",
        dueAt: d21Date,
        openFrom: new Date(baseDate.getTime() + 14 * DAY),
        status: i < 6 ? "COMPLETED" : "SCHEDULED",
      },
    });
    if (i < 6) {
      const improvement = ["beaucoup_mieux", "mieux"].includes(changes[i]) ? 4 : 1;
      await prisma.questionnaireResponse.create({
        data: {
          episodeId: episode.id,
          formTaskId: d21Task.id,
          kind: "D21",
          questionnaireVersion: "v1.0",
          submittedAt: d21Date,
          answers: JSON.stringify({
            global_change: changes[i],
            symptom_intensity: Math.max(0, t0Symptom - improvement),
            daily_limitation: Math.max(0, 5 + (i % 3) - improvement),
            sleep: 4 + improvement >= 10 ? 9 : 4 + improvement,
            energy: 4 + improvement >= 10 ? 9 : 4 + improvement,
            stress: Math.max(0, 6 - improvement),
            benefit_duration: improvement > 2 ? "toujours" : "4_7j",
            continue_rop: "oui",
          }),
        },
      });
    }
  }

  await prisma.auditLog.create({
    data: { userId: admin.id, action: "SEED", detail: "Données de démonstration générées" },
  });

  console.log(`8 épisodes de démonstration créés pour ${practitioner.fullName}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
