import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { generateToken, hashToken } from "./tokens";
import {
  RegistryValidationError,
  trainingsAtDate,
  type ProfileInput,
  type SessionInput,
  type parseEpisode,
} from "./registry";

type EpisodeInput = ReturnType<typeof parseEpisode>;

async function requireWriter(
  tx: Prisma.TransactionClient,
  practitionerId: string,
) {
  const user = await tx.user.findUnique({ where: { id: practitionerId } });
  if (
    !user ||
    user.role !== "PRACTITIONER" ||
    user.certificationStatus !== "ACTIVE" ||
    !user.protocolAcceptedAt
  ) {
    throw new RegistryValidationError(
      "Un compte praticien actif et l’acceptation du protocole sont nécessaires.",
    );
  }
}

async function sessionData(
  tx: Prisma.TransactionClient,
  practitionerId: string,
  input: SessionInput,
) {
  const [profile, certification] = await Promise.all([
    tx.practitionerProfileVersion.findFirst({
      where: { practitionerId, effectiveFrom: { lte: input.performedAt } },
      orderBy: [
        { effectiveFrom: "desc" },
        { recordedAt: "desc" },
        { id: "desc" },
      ],
    }),
    tx.certificationEvent.findFirst({
      where: { practitionerId, effectiveFrom: { lte: input.performedAt } },
      orderBy: [
        { effectiveFrom: "desc" },
        { recordedAt: "desc" },
        { id: "desc" },
      ],
    }),
  ]);
  if (!profile)
    throw new RegistryValidationError(
      "Complétez d’abord votre profil professionnel avec une date d’effet au plus tard à la date de cette séance (Mon compte).",
    );
  const { zones, ...fields } = input;
  if (
    zones.reduce((sum, zone) => sum + (zone.durationSeconds ?? 0), 0) >
    input.durationMinutes * 60
  ) {
    throw new RegistryValidationError(
      "La durée cumulée des zones dépasse celle de la séance.",
    );
  }
  const practitionerSnapshot: Prisma.InputJsonObject = {
    profileVersionId: profile.id,
    professionalBackground: profile.professionalBackground,
    practiceSetting: profile.practiceSetting,
    ropStartedYear: profile.ropStartedYear,
    experienceYears:
      input.performedAt.getUTCFullYear() - profile.ropStartedYear,
    monthlyCaseVolume: profile.monthlyCaseVolume,
    otherModalities: profile.otherModalities,
    trainings: trainingsAtDate(profile.trainings, input.performedAt).map(
      (t) => ({ ...t }),
    ),
    certificationStatus: certification?.status ?? null,
    effectiveFrom: profile.effectiveFrom.toISOString().slice(0, 10),
  };
  return {
    ...fields,
    practitionerId,
    practitionerProfileVersionId: profile.id,
    certificationEventId: certification?.id ?? null,
    practitionerSnapshot,
    zones: { create: zones.map((zone, i) => ({ ...zone, sequence: i + 1 })) },
  };
}

export async function createCareEpisode(
  practitionerId: string,
  input: EpisodeInput,
) {
  const token = generateToken();
  const now = new Date();
  const episode = await prisma.$transaction(async (tx) => {
    await requireWriter(tx, practitionerId);
    const patient = input.patientId
      ? await tx.patient.findFirst({
          where: { id: input.patientId, practitionerId },
        })
      : await tx.patient.create({
          data: {
            practitionerId,
            code: `ROP-${randomBytes(6).toString("hex").toUpperCase()}`,
            ageBand: input.ageBand,
            sex: input.sex,
          },
        });
    if (!patient)
      throw new RegistryValidationError("Patient introuvable ou accès refusé.");
    if (input.patientId) {
      await tx.patient.update({
        where: { id: patient.id },
        data: { ageBand: input.ageBand, sex: input.sex },
      });
    }
    const { session, contactEmail, ...context } = input;
    // Demographics on the episode are a baseline snapshot, not a live relation.
    const created = await tx.episode.create({
      data: {
        ...context,
        ageBand: input.ageBand,
        sex: input.sex,
        patientId: patient.id,
        practitionerId,
        tokenHash: hashToken(token),
        startedAt: session.performedAt,
        contextConsentConfirmedAt: now,
        linkExpiresAt: new Date(now.getTime() + 45 * 86400000),
        formTasks: {
          create: { kind: "T0", dueAt: now, openFrom: now, status: "OPEN" },
        },
        ...(contactEmail
          ? {
              contact: {
                create: { email: contactEmail, contactConsent: false },
              },
            }
          : {}),
      },
    });
    await tx.treatmentSession.create({
      data: {
        ...(await sessionData(tx, practitionerId, session)),
        episodeId: created.id,
      },
    });
    await tx.auditLog.create({
      data: {
        userId: practitionerId,
        action: "CREATE_EPISODE",
        objectType: "Episode",
        objectId: created.id,
      },
    });
    return { ...created, patientCode: patient.code };
  });
  return { episode, token };
}

export async function recordTreatmentSession(
  practitionerId: string,
  episodeId: string,
  input: SessionInput,
) {
  return prisma.$transaction(async (tx) => {
    await requireWriter(tx, practitionerId);
    const episode = await tx.episode.findFirst({
      where: { id: episodeId, practitionerId },
    });
    if (!episode || episode.status === "REVOKED")
      throw new RegistryValidationError(
        "Épisode indisponible ou accès refusé.",
      );
    if (
      input.performedAt < new Date(episode.startedAt.toISOString().slice(0, 10))
    )
      throw new RegistryValidationError(
        "La séance ne peut pas précéder le début de cet épisode.",
      );
    // A supplied index with a database unique constraint prevents duplicate submissions.
    const session = await tx.treatmentSession.create({
      data: { ...(await sessionData(tx, practitionerId, input)), episodeId },
    });
    await tx.auditLog.create({
      data: {
        userId: practitionerId,
        action: "RECORD_TREATMENT_SESSION",
        objectType: "TreatmentSession",
        objectId: session.id,
      },
    });
    return { session, patientId: episode.patientId };
  });
}

export async function savePractitionerProfile(
  practitionerId: string,
  input: ProfileInput,
) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: practitionerId } });
    if (!user || user.role !== "PRACTITIONER")
      throw new RegistryValidationError("Profil réservé aux praticiens.");
    const profile = await tx.practitionerProfileVersion.create({
      data: {
        ...input,
        trainings: input.trainings.map((t) => ({ ...t })),
        practitionerId,
      },
    });
    await tx.auditLog.create({
      data: {
        userId: practitionerId,
        action: "SAVE_PRACTITIONER_PROFILE",
        objectType: "PractitionerProfileVersion",
        objectId: profile.id,
      },
    });
    return profile;
  });
}

export async function reassignEpisodePatient(
  practitionerId: string,
  episodeId: string,
  patientId: string,
) {
  return prisma.$transaction(async (tx) => {
    await requireWriter(tx, practitionerId);
    const [episode, patient] = await Promise.all([
      tx.episode.findFirst({ where: { id: episodeId, practitionerId } }),
      tx.patient.findFirst({ where: { id: patientId, practitionerId } }),
    ]);
    if (!episode || !patient)
      throw new RegistryValidationError(
        "Patient ou épisode introuvable, ou accès refusé.",
      );
    if (episode.patientId === patientId) return episode.patientId;
    await tx.episode.update({ where: { id: episodeId }, data: { patientId } });
    await tx.auditLog.create({
      data: {
        userId: practitionerId,
        action: "LINK_EPISODE_PATIENT",
        objectType: "Episode",
        objectId: episodeId,
        detail: JSON.stringify({
          previousPatientId: episode.patientId,
          patientId,
        }),
      },
    });
    return episode.patientId;
  });
}
