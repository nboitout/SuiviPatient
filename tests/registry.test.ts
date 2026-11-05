import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dateOnly,
  parseEpisode,
  parseProfile,
  parseSession,
  trainingsAtDate,
} from "../lib/registry";

const session = {
  sessionIndex: 1,
  performedAt: "2025-01-10",
  protocolVersion: "v1",
  durationMinutes: 30,
  zones: [
    {
      site: "podal",
      zoneLabel: "Zone descriptive",
      side: "gauche",
      technique: "Pression",
      intensity: "legere",
    },
  ],
};

test("validates dates without normalising impossible or future dates", () => {
  assert.throws(() => dateOnly("2025-02-30"));
  assert.throws(() => dateOnly("2999-01-01"));
  assert.equal(
    dateOnly("2024-02-29").toISOString(),
    "2024-02-29T00:00:00.000Z",
  );
});
test("rejects malformed session fields, unsupported choices and unbounded arrays", () => {
  assert.throws(() => parseSession({ ...session, durationMinutes: true }));
  assert.throws(() => parseSession({ ...session, sessionIndex: -1 }));
  assert.throws(() => parseSession({ ...session, zones: [] }));
  assert.throws(() =>
    parseSession({ ...session, zones: Array(21).fill(session.zones[0]) }),
  );
  assert.throws(() =>
    parseSession({
      ...session,
      zones: [{ ...session.zones[0], side: "invalid" }],
    }),
  );
  assert.throws(() =>
    parseSession({
      ...session,
      zones: [{ ...session.zones[0], technique: "x".repeat(161) }],
    }),
  );
});
test("preserves zone order and distinguishes missing values from zero", () => {
  const parsed = parseSession({
    ...session,
    zones: [session.zones[0], { ...session.zones[0], zoneLabel: "Deuxième" }],
  });
  assert.deepEqual(
    parsed.zones.map((z) => z.zoneLabel),
    ["Zone descriptive", "Deuxième"],
  );
  assert.equal(parsed.zones[0].durationSeconds, null);
  const form = new FormData();
  for (const [key, value] of Object.entries({
    mainIndication: "digestif",
    presentingProblem: "Confort",
    symptomDuration: "gt12m",
    medicalAssessment: "suivi",
    contextConsent: "on",
    baselineSeverity: "0",
    session: JSON.stringify(session),
  }))
    form.set(key, value);
  assert.equal(parseEpisode(form).baselineSeverity, 0);
  assert.equal(parseEpisode(form).baselineImpact, null);
  form.delete("contextConsent");
  assert.throws(() => parseEpisode(form));
});
test("retains only training completed by the date of treatment", () => {
  const records = [
    { module: "Initial", completedOn: "2020-01-01", provider: "Institut" },
    { module: "Later", completedOn: "2025-02-01", provider: "Institut" },
  ];
  assert.deepEqual(trainingsAtDate(records, new Date("2025-01-10")), [
    records[0],
  ]);
});
test("validates profile dates, years and training structure", () => {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    effectiveFrom: "2025-01-01",
    professionalBackground: "Praticien",
    practiceSetting: "cabinet",
    ropStartedYear: "2020",
    trainings: "[]",
  }))
    form.set(key, value);
  assert.equal(parseProfile(form).ropStartedYear, 2020);
  form.set("ropStartedYear", "2026");
  assert.throws(() => parseProfile(form));
  form.set("ropStartedYear", "2020");
  form.set("trainings", "{}");
  assert.throws(() => parseProfile(form));
});
