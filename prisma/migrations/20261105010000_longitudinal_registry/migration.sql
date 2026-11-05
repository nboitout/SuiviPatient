BEGIN;

-- Add fields as nullable until historical records have been preserved.
ALTER TABLE "Episode"
ADD COLUMN     "baselineImpact" INTEGER,
ADD COLUMN     "baselineSeverity" INTEGER,
ADD COLUMN     "concurrentCare" TEXT,
ADD COLUMN     "contextConsentConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "medicalAssessment" TEXT,
ADD COLUMN     "patientExpectations" TEXT,
ADD COLUMN     "patientId" TEXT,
ADD COLUMN     "presentingProblem" TEXT,
ADD COLUMN     "symptomDuration" TEXT;

-- CreateTable
CREATE TABLE "PractitionerProfileVersion" (
    "id" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "professionalBackground" TEXT NOT NULL,
    "practiceSetting" TEXT NOT NULL,
    "ropStartedYear" INTEGER NOT NULL,
    "monthlyCaseVolume" TEXT,
    "otherModalities" TEXT,
    "trainings" JSONB NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PractitionerProfileVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificationEvent" (
    "id" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "status" "CertificationStatus" NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT,

    CONSTRAINT "CertificationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "ageBand" TEXT,
    "sex" TEXT,
    "legacyImported" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreatmentSession" (
    "id" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "practitionerId" TEXT NOT NULL,
    "sessionIndex" INTEGER NOT NULL,
    "performedAt" DATE NOT NULL,
    "protocolVersion" TEXT,
    "atlasVersion" TEXT,
    "durationMinutes" INTEGER,
    "deviations" TEXT,
    "immediateResponse" TEXT,
    "concurrentCareChanges" TEXT,
    "legacyImported" BOOLEAN NOT NULL DEFAULT false,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "practitionerProfileVersionId" TEXT,
    "certificationEventId" TEXT,
    "practitionerSnapshot" JSONB,

    CONSTRAINT "TreatmentSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionZoneTreatment" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "site" TEXT NOT NULL,
    "zoneLabel" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "technique" TEXT NOT NULL,
    "intensity" TEXT NOT NULL,
    "durationSeconds" INTEGER,
    "findingsBefore" TEXT,
    "findingsAfter" TEXT,

    CONSTRAINT "SessionZoneTreatment_pkey" PRIMARY KEY ("id")
);

-- No reliable longitudinal identity existed. Never infer identity from contact details.
INSERT INTO "Patient" ("id", "code", "practitionerId", "ageBand", "sex", "legacyImported", "createdAt")
SELECT 'legacy-patient-' || "id", 'ROP-' || upper("id"), "practitionerId", "ageBand", "sex", true, "createdAt"
FROM "Episode";

UPDATE "Episode" SET "patientId" = 'legacy-patient-' || "id";

-- Preserve the original session number/date. Unknown treatment details stay unknown.
INSERT INTO "TreatmentSession" ("id", "episodeId", "practitionerId", "sessionIndex", "performedAt", "legacyImported", "recordedAt")
SELECT 'legacy-session-' || "id", "id", "practitionerId", "sessionNumber", "sessionDate"::date, true, "createdAt"
FROM "Episode";

-- The current status is known now, not retroactively on past treatment dates.
INSERT INTO "CertificationEvent" ("id", "practitionerId", "status", "effectiveFrom")
SELECT 'initial-certification-' || "id", "id", "certificationStatus", CURRENT_DATE
FROM "User" WHERE "role" = 'PRACTITIONER';

ALTER TABLE "Episode" ALTER COLUMN "patientId" SET NOT NULL, DROP COLUMN "sessionNumber";

-- CreateIndex
CREATE INDEX "PractitionerProfileVersion_practitionerId_effectiveFrom_rec_idx" ON "PractitionerProfileVersion"("practitionerId", "effectiveFrom", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PractitionerProfileVersion_id_practitionerId_key" ON "PractitionerProfileVersion"("id", "practitionerId");

-- CreateIndex
CREATE INDEX "CertificationEvent_practitionerId_effectiveFrom_recordedAt_idx" ON "CertificationEvent"("practitionerId", "effectiveFrom", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CertificationEvent_id_practitionerId_key" ON "CertificationEvent"("id", "practitionerId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_code_key" ON "Patient"("code");

-- CreateIndex
CREATE INDEX "Patient_practitionerId_createdAt_idx" ON "Patient"("practitionerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_id_practitionerId_key" ON "Patient"("id", "practitionerId");

-- CreateIndex
CREATE INDEX "TreatmentSession_practitionerId_performedAt_idx" ON "TreatmentSession"("practitionerId", "performedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TreatmentSession_episodeId_sessionIndex_key" ON "TreatmentSession"("episodeId", "sessionIndex");

-- CreateIndex
CREATE UNIQUE INDEX "SessionZoneTreatment_sessionId_sequence_key" ON "SessionZoneTreatment"("sessionId", "sequence");

-- CreateIndex
CREATE INDEX "Episode_patientId_sessionDate_idx" ON "Episode"("patientId", "sessionDate");

-- CreateIndex
CREATE UNIQUE INDEX "Episode_id_practitionerId_key" ON "Episode"("id", "practitionerId");

-- AddForeignKey
ALTER TABLE "PractitionerProfileVersion" ADD CONSTRAINT "PractitionerProfileVersion_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificationEvent" ADD CONSTRAINT "CertificationEvent_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Episode" ADD CONSTRAINT "Episode_patientId_practitionerId_fkey" FOREIGN KEY ("patientId", "practitionerId") REFERENCES "Patient"("id", "practitionerId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentSession" ADD CONSTRAINT "TreatmentSession_episodeId_practitionerId_fkey" FOREIGN KEY ("episodeId", "practitionerId") REFERENCES "Episode"("id", "practitionerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentSession" ADD CONSTRAINT "TreatmentSession_practitionerId_fkey" FOREIGN KEY ("practitionerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentSession" ADD CONSTRAINT "TreatmentSession_practitionerProfileVersionId_practitioner_fkey" FOREIGN KEY ("practitionerProfileVersionId", "practitionerId") REFERENCES "PractitionerProfileVersion"("id", "practitionerId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentSession" ADD CONSTRAINT "TreatmentSession_certificationEventId_practitionerId_fkey" FOREIGN KEY ("certificationEventId", "practitionerId") REFERENCES "CertificationEvent"("id", "practitionerId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionZoneTreatment" ADD CONSTRAINT "SessionZoneTreatment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TreatmentSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;


COMMIT;
