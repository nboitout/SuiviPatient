import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { parseEpisode, parseSession } from "../lib/registry";

// Only an explicitly supplied loopback database is accepted. Each run owns a new schema.
const localUrl = process.env.REGISTRY_TEST_DATABASE_URL;
if (
  !localUrl ||
  !["127.0.0.1", "localhost"].includes(new URL(localUrl).hostname)
)
  throw new Error(
    "REGISTRY_TEST_DATABASE_URL must point to an explicit local test database.",
  );
const schema = `rop_registry_test_${randomUUID().replaceAll("-", "")}`;
const testUrl = new URL(localUrl);
testUrl.searchParams.set("schema", schema);
process.env.DATABASE_URL = testUrl.toString();
const db = new PrismaClient({
  datasources: { db: { url: testUrl.toString() } },
});
const cli = resolve("node_modules/prisma/build/index.js");
let records: typeof import("../lib/registry-records");
let serviceDb: PrismaClient;
let owner: string, outsider: string;
let episodeId: string, patientId: string;
const sessionInput = {
  sessionIndex: 1,
  performedAt: "2025-01-10",
  protocolVersion: "routine-v1",
  atlasVersion: "edition-2025",
  durationMinutes: 30,
  zones: [
    {
      site: "podal",
      zoneLabel: "Première zone",
      side: "gauche",
      technique: "Pression",
      intensity: "legere",
      durationSeconds: 60,
    },
    {
      site: "occipital",
      zoneLabel: "Deuxième zone",
      side: "median",
      technique: "Pression progressive",
      intensity: "moderee",
    },
  ],
};
function input(patient = "") {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    patientId: patient,
    mainIndication: "digestif",
    presentingProblem: "Symptôme fictif",
    symptomDuration: "gt12m",
    medicalAssessment: "suivi",
    baselineSeverity: "6",
    baselineImpact: "4",
    contextConsent: "on",
    ageBand: "31-45",
    session: JSON.stringify(sessionInput),
  }))
    form.set(key, value);
  return parseEpisode(form);
}
function runPrisma(args: string[]) {
  return execFileSync(process.execPath, [cli, ...args], {
    env: { ...process.env, DATABASE_URL: testUrl.toString() },
    stdio: "pipe",
  }).toString();
}

before(async () => {
  await db.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  runPrisma([
    "db",
    "execute",
    "--file",
    "prisma/migrations/20261105000000_baseline/migration.sql",
    "--url",
    testUrl.toString(),
  ]);
  runPrisma(["migrate", "resolve", "--applied", "20261105000000_baseline"]);
  // A genuine pre-upgrade record with a token, contact, consent and questionnaire.
  await db.$executeRawUnsafe(
    `INSERT INTO "${schema}"."User" (id,email,"passwordHash","fullName",role,"certificationStatus","updatedAt") VALUES ('legacy-user','legacy@fixture.invalid','unused','Fixture','PRACTITIONER','ACTIVE',NOW())`,
  );
  await db.$executeRawUnsafe(
    `INSERT INTO "${schema}"."Episode" (id,"tokenHash","practitionerId","sessionNumber","sessionDate","mainIndication","linkExpiresAt","updatedAt") VALUES ('legacy-episode','unchanged-token-hash','legacy-user',3,'2024-01-10','digestif','2027-01-01',NOW())`,
  );
  await db.$executeRawUnsafe(
    `INSERT INTO "${schema}"."PatientContact" (id,"episodeId",email) VALUES ('legacy-contact','legacy-episode','patient@fixture.invalid')`,
  );
  await db.$executeRawUnsafe(
    `INSERT INTO "${schema}"."ConsentRecord" (id,"episodeId",type,version,granted) VALUES ('legacy-consent','legacy-episode','OUTCOMES_MONITORING','v1',true)`,
  );
  await db.$executeRawUnsafe(
    `INSERT INTO "${schema}"."FormTask" (id,"episodeId",kind,"dueAt","openFrom",status) VALUES ('legacy-task','legacy-episode','T0','2024-01-10','2024-01-10','COMPLETED')`,
  );
  await db.$executeRawUnsafe(
    `INSERT INTO "${schema}"."QuestionnaireResponse" (id,"episodeId","formTaskId",kind,"questionnaireVersion",answers) VALUES ('legacy-response','legacy-episode','legacy-task','T0','v1','{"symptom_intensity":6}')`,
  );
  runPrisma(["migrate", "deploy"]);
  records = await import("../lib/registry-records");
  serviceDb = (await import("../lib/db")).prisma;
  const createUser = (email: string) =>
    db.user.create({
      data: {
        email,
        fullName: "Test practitioner",
        passwordHash: "unused",
        role: "PRACTITIONER",
        certificationStatus: "ACTIVE",
        protocolAcceptedAt: new Date(),
        certificationHistory: {
          create: { status: "ACTIVE", effectiveFrom: new Date("2020-01-01") },
        },
      },
    });
  owner = (await createUser("owner@fixture.invalid")).id;
  outsider = (await createUser("outsider@fixture.invalid")).id;
  await records.savePractitionerProfile(owner, {
    effectiveFrom: new Date("2020-01-01"),
    professionalBackground: "Initial profession",
    practiceSetting: "cabinet",
    ropStartedYear: 2018,
    monthlyCaseVolume: "de_10_30",
    otherModalities: null,
    trainings: [
      { module: "Initial", completedOn: "2019-01-01", provider: "Institut" },
      {
        module: "Future training",
        completedOn: "2025-02-01",
        provider: "Institut",
      },
    ],
  });
});

after(async () => {
  if (serviceDb) await serviceDb.$disconnect();
  // The generated schema name is never supplied by the caller.
  await db.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  // Local PGlite servers can reuse session settings across logical connections.
  await db.$executeRawUnsafe("SET search_path TO public");
  await db.$disconnect();
});

test("migration preserves legacy records and does not invent historical qualifications", async () => {
  const episode = await db.episode.findUniqueOrThrow({
    where: { id: "legacy-episode" },
    include: {
      patient: true,
      treatmentSessions: true,
      contact: true,
      responses: true,
      consents: true,
    },
  });
  assert.equal(episode.patient.legacyImported, true);
  assert.equal(episode.treatmentSessions[0].sessionIndex, 3);
  assert.equal(
    episode.treatmentSessions[0].performedAt.toISOString().slice(0, 10),
    "2024-01-10",
  );
  assert.equal(episode.treatmentSessions[0].practitionerSnapshot, null);
  assert.equal(episode.tokenHash, "unchanged-token-hash");
  assert.equal(episode.contact?.email, "patient@fixture.invalid");
  assert.equal(episode.responses[0].answers, '{"symptom_intensity":6}');
  assert.equal(episode.consents[0].granted, true);
});
test("creates a patient, episode and ordered session atomically", async () => {
  const { episode } = await records.createCareEpisode(owner, input());
  episodeId = episode.id;
  patientId = episode.patientId;
  const stored = await db.episode.findUniqueOrThrow({
    where: { id: episodeId },
    include: {
      patient: true,
      formTasks: true,
      treatmentSessions: {
        include: { zones: { orderBy: { sequence: "asc" } } },
      },
    },
  });
  assert.match(stored.patient.code, /^ROP-[A-F0-9]{12}$/);
  assert.equal(stored.formTasks[0].kind, "T0");
  assert.deepEqual(
    stored.treatmentSessions[0].zones.map((z) => z.zoneLabel),
    ["Première zone", "Deuxième zone"],
  );
  assert.equal(
    (
      stored.treatmentSessions[0].practitionerSnapshot as {
        trainings: unknown[];
      }
    ).trainings.length,
    1,
  );
});
test("links a returning patient to multiple episodes without duplicating identity", async () => {
  const result = await records.createCareEpisode(owner, {
    ...input(patientId),
    ageBand: "46-60",
  });
  assert.equal(result.episode.patientId, patientId);
  assert.equal(await db.patient.count({ where: { practitionerId: owner } }), 1);
  assert.equal(await db.episode.count({ where: { patientId } }), 2);
  assert.equal(result.episode.ageBand, "46-60");
  assert.equal(
    (await db.patient.findUniqueOrThrow({ where: { id: patientId } })).ageBand,
    "46-60",
  );
  assert.equal(
    (await db.episode.findUniqueOrThrow({ where: { id: episodeId } })).ageBand,
    "31-45",
  );
});
test("appends sessions and keeps earlier profile snapshots unchanged", async () => {
  const first = await db.treatmentSession.findFirstOrThrow({
    where: { episodeId },
  });
  await records.savePractitionerProfile(owner, {
    effectiveFrom: new Date("2025-01-15"),
    professionalBackground: "Updated profession",
    practiceSetting: "groupe",
    ropStartedYear: 2018,
    monthlyCaseVolume: null,
    otherModalities: null,
    trainings: [],
  });
  await records.recordTreatmentSession(
    owner,
    episodeId,
    parseSession({
      ...sessionInput,
      sessionIndex: 2,
      performedAt: "2025-01-20",
    }),
  );
  const second = await db.treatmentSession.findUniqueOrThrow({
    where: { episodeId_sessionIndex: { episodeId, sessionIndex: 2 } },
  });
  assert.equal(
    (second.practitionerSnapshot as { professionalBackground: string })
      .professionalBackground,
    "Updated profession",
  );
  assert.deepEqual(
    (await db.treatmentSession.findUniqueOrThrow({ where: { id: first.id } }))
      .practitionerSnapshot,
    first.practitionerSnapshot,
  );
  const duplicates = await Promise.allSettled(
    [1, 2].map(() =>
      records.recordTreatmentSession(
        owner,
        episodeId,
        parseSession({
          ...sessionInput,
          sessionIndex: 3,
          performedAt: "2025-01-21",
        }),
      ),
    ),
  );
  assert.equal(duplicates.filter((r) => r.status === "fulfilled").length, 1);
});
test("blocks cross-practitioner patient selection, session writes and linking", async () => {
  await assert.rejects(
    records.createCareEpisode(outsider, input(patientId)),
    /accès refusé/,
  );
  await assert.rejects(
    records.recordTreatmentSession(
      outsider,
      episodeId,
      parseSession(sessionInput),
    ),
    /accès refusé/,
  );
  const foreignPatient = await db.patient.create({
    data: { code: "FOREIGN", practitionerId: outsider },
  });
  await assert.rejects(
    records.reassignEpisodePatient(owner, episodeId, foreignPatient.id),
    /accès refusé/,
  );
  // Database-level composite foreign key also rejects a bypass of application checks.
  await assert.rejects(
    db.episode.update({
      where: { id: episodeId },
      data: { patientId: foreignPatient.id },
    }),
  );
});
test("failed creation rolls back patient, episode and all nested records", async () => {
  const before = await db.patient.count({
    where: { practitionerId: outsider },
  });
  await assert.rejects(
    records.createCareEpisode(outsider, input()),
    /profil professionnel/,
  );
  assert.equal(
    await db.patient.count({ where: { practitionerId: outsider } }),
    before,
  );
  assert.equal(
    await db.episode.count({ where: { practitionerId: outsider } }),
    0,
  );
});
test("manual linking preserves questionnaires and treatment records and records provenance", async () => {
  const other = await records.createCareEpisode(owner, input());
  const previous = await records.reassignEpisodePatient(
    owner,
    other.episode.id,
    patientId,
  );
  assert.equal(previous, other.episode.patientId);
  assert.equal(
    await db.treatmentSession.count({ where: { episodeId: other.episode.id } }),
    1,
  );
  assert.equal(
    await db.formTask.count({ where: { episodeId: other.episode.id } }),
    1,
  );
  assert.equal(
    await db.auditLog.count({
      where: { action: "LINK_EPISODE_PATIENT", objectId: other.episode.id },
    }),
    1,
  );
});
test("inactive practitioners cannot record treatment", async () => {
  await db.user.update({
    where: { id: owner },
    data: { certificationStatus: "SUSPENDED" },
  });
  await assert.rejects(
    records.recordTreatmentSession(
      owner,
      episodeId,
      parseSession({ ...sessionInput, sessionIndex: 4 }),
    ),
    /compte praticien actif/,
  );
});
