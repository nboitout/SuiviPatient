import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

// Run against a built app connected to the same disposable, local UI database.
// Never sends fixture credentials to a remote application or touches production.
const base = new URL(process.env.ACCESS_TEST_BASE_URL ?? "http://127.0.0.1:3005");
const database = new URL(process.env.ACCESS_TEST_DATABASE_URL ?? "http://missing");
assert.ok(["localhost", "127.0.0.1"].includes(base.hostname), "App must be local");
assert.ok(["localhost", "127.0.0.1"].includes(database.hostname), "Database must be local");
assert.match(database.searchParams.get("schema") ?? "", /^rop_(ui|access)_\w+$/, "Use a disposable test schema");
const db = new PrismaClient({ datasources: { db: { url: database.toString() } } });
const fixtureId = randomUUID();
const users: string[] = [];
let adminCookie = "", practitionerCookie = "", expiredCookie = "";
const adminPaths = ["/admin", "/admin/praticiens", "/admin/observatoire", "/admin/audit", "/admin/compte"];

async function createSession(role: "ADMIN" | "PRACTITIONER", expired = false) {
  const user = await db.user.create({ data: {
    email: `${role.toLowerCase()}-${expired}-${fixtureId}@fixture.invalid`,
    fullName: `Access fixture ${role}`, role, passwordHash: "unused-test-session-only",
  } });
  users.push(user.id);
  const token = randomBytes(32).toString("hex");
  await db.authSession.create({ data: {
    userId: user.id, tokenHash: createHash("sha256").update(token).digest("hex"),
    expiresAt: new Date(Date.now() + (expired ? -60_000 : 60_000 * 30)),
  } });
  return `sp_session=${token}`;
}

before(async () => {
  adminCookie = await createSession("ADMIN");
  practitionerCookie = await createSession("PRACTITIONER");
  expiredCookie = await createSession("ADMIN", true);
});
after(async () => {
  await db.auditLog.deleteMany({ where: { userId: { in: users } } });
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.$disconnect();
});

async function get(path: string, cookie = "") {
  return fetch(new URL(path, base), { redirect: "manual", headers: cookie ? { Cookie: cookie } : {} });
}

async function assertRedirect(path: string, cookie: string, destination: string) {
  const response = await get(path, cookie);
  assert.ok([303, 307, 308].includes(response.status), `${path} returned ${response.status}`);
  assert.equal(response.headers.get("location"), destination);
  const html = await response.text();
  assert.ok(!html.includes("Access fixture ADMIN"), "Admin identity leaked");
}

test("anonymous visitors cannot render any admin page or download the export", async () => {
  for (const path of adminPaths) await assertRedirect(path, "", "/admin/login");
  assert.equal((await get("/api/admin/export")).status, 403);
});

test("practitioners cannot access admin pages, including direct links and exports", async () => {
  for (const path of adminPaths) await assertRedirect(path, practitionerCookie, "/praticien");
  assert.equal((await get("/api/admin/export", practitionerCookie)).status, 403);
});

test("expired admin sessions return to the dedicated login screen", async () => {
  await assertRedirect("/admin", expiredCookie, "/admin/login");
  assert.equal((await get("/api/admin/export", expiredCookie)).status, 403);
});

test("admins can open the dashboard, all sections, and the aggregate export", async () => {
  for (const path of adminPaths) {
    const response = await get(path, adminCookie);
    assert.equal(response.status, 200, path);
    const html = await response.text();
    assert.ok(html.includes("Access fixture ADMIN"), `${path} did not render the authenticated shell`);
    assert.ok(!html.includes("NEXT_HTTP_ERROR_FALLBACK"), `${path} rendered an error boundary`);
  }
  const response = await get("/api/admin/export", adminCookie);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /text\/csv/);
  assert.match(await response.text(), /indicateur;valeur/);
});

test("public home and both sign-in pages remain accessible without a session", async () => {
  for (const path of ["/", "/admin/login", "/praticien/login", "/questionnaires/apercu"]) {
    assert.equal((await get(path)).status, 200, path);
  }
  await assertRedirect("/admin/login", adminCookie, "/admin");
  await assertRedirect("/praticien/login", practitionerCookie, "/praticien");
});
