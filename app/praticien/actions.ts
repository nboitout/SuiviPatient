"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { login, logout, requirePractitioner } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { createEpisode } from "@/lib/episodes";
import { generateToken, hashToken } from "@/lib/tokens";
import type { AlertStatus } from "@prisma/client";

const PROTOCOL_VERSION = "protocole-v1.0";

export interface LoginState {
  error?: string;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const user = await login(email, password);
  if (!user) return { error: "Identifiants incorrects." };
  if (user.role === "ADMIN") redirect("/admin");
  redirect("/praticien");
}

export async function logoutAction(): Promise<void> {
  await logout();
  redirect("/praticien/login");
}

export interface ChangePasswordState {
  error?: string;
}

// Changement de mot de passe par l'utilisateur connecté (praticien ou admin).
// Toutes les sessions sont révoquées : reconnexion requise avec le nouveau mot de passe.
export async function changeOwnPasswordAction(
  _prev: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const user = await requirePractitioner();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const bcrypt = (await import("bcryptjs")).default;
  const ok = await bcrypt.compare(current, user.passwordHash);
  if (!ok) {
    await logAudit(user.id, "PASSWORD_CHANGE", { outcome: "BAD_CURRENT_PASSWORD" });
    return { error: "Mot de passe actuel incorrect." };
  }
  if (next.length < 10) {
    return { error: "Le nouveau mot de passe doit comporter au moins 10 caractères." };
  }
  if (next !== confirm) {
    return { error: "La confirmation ne correspond pas au nouveau mot de passe." };
  }
  if (next === current) {
    return { error: "Le nouveau mot de passe doit être différent de l'actuel." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(next, 12) },
  });
  await prisma.authSession.deleteMany({ where: { userId: user.id } });
  await logAudit(user.id, "PASSWORD_CHANGE", { outcome: "OK" });
  await logout();
  redirect("/praticien/login?pw=changed");
}

export async function acceptProtocolAction(): Promise<void> {
  const user = await requirePractitioner();
  await prisma.user.update({
    where: { id: user.id },
    data: { protocolAcceptedAt: new Date(), protocolVersion: PROTOCOL_VERSION },
  });
  await logAudit(user.id, "PROTOCOL_ACCEPTED", { detail: PROTOCOL_VERSION });
  revalidatePath("/praticien");
}

export interface CreateEpisodeState {
  error?: string;
  link?: string;
  qrDataUrl?: string;
  episodeId?: string;
}

export async function createEpisodeAction(
  _prev: CreateEpisodeState,
  formData: FormData
): Promise<CreateEpisodeState> {
  const user = await requirePractitioner();
  if (user.certificationStatus !== "ACTIVE") {
    return { error: "Votre compte n'est pas actif : vous ne pouvez pas créer de suivi (PRA-02)." };
  }
  if (!user.protocolAcceptedAt) {
    return { error: "Vous devez d'abord accepter le protocole de suivi." };
  }

  const mainIndication = String(formData.get("mainIndication") ?? "");
  const sessionNumber = Number(formData.get("sessionNumber") ?? 1);
  const sessionDate = String(formData.get("sessionDate") ?? "");
  if (!mainIndication || !sessionDate || !Number.isInteger(sessionNumber) || sessionNumber < 1) {
    return { error: "Merci de renseigner les champs obligatoires." };
  }

  const { episode, token } = await createEpisode({
    practitionerId: user.id,
    sessionNumber,
    sessionDate: new Date(sessionDate),
    mainIndication,
    ropFocus: String(formData.get("ropFocus") ?? "") || undefined,
    ageBand: String(formData.get("ageBand") ?? "") || undefined,
    sex: String(formData.get("sex") ?? "") || undefined,
    contactEmail: String(formData.get("contactEmail") ?? "") || undefined,
  });

  await logAudit(user.id, "CREATE_EPISODE", { objectType: "Episode", objectId: episode.id });

  const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const link = `${base}/s/${token}`;
  const qrDataUrl = await QRCode.toDataURL(link, { width: 280, margin: 2 });
  return { link, qrDataUrl, episodeId: episode.id };
}

export async function updateAlertAction(alertId: string, status: string): Promise<void> {
  const user = await requirePractitioner();
  const alert = await prisma.alert.findUnique({
    where: { id: alertId },
    include: { episode: { select: { practitionerId: true } } },
  });
  // Cloisonnement strict : uniquement les alertes de ses propres patients (PRI-05)
  if (!alert || alert.episode.practitionerId !== user.id) {
    await logAudit(user.id, "ALERT_ACTION", { objectId: alertId, outcome: "DENIED" });
    throw new Error("FORBIDDEN");
  }
  await prisma.alert.update({
    where: { id: alertId },
    data: { status: status as AlertStatus, reviewedAt: new Date(), reviewerId: user.id },
  });
  await logAudit(user.id, "ALERT_ACTION", { objectType: "Alert", objectId: alertId, detail: status });
  revalidatePath("/praticien/alertes");
  revalidatePath("/praticien");
}

export interface RegenerateLinkState {
  error?: string;
  link?: string;
  qrDataUrl?: string;
}

// Renvoi manuel / régénération du lien (PRA-04, REM-05) : révoque l'ancien jeton.
export async function regenerateLinkAction(
  episodeId: string,
  // état précédent requis par useActionState via bind
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _prev: RegenerateLinkState
): Promise<RegenerateLinkState> {
  const user = await requirePractitioner();
  const episode = await prisma.episode.findUnique({ where: { id: episodeId } });
  if (!episode || episode.practitionerId !== user.id) {
    await logAudit(user.id, "REGENERATE_LINK", { objectId: episodeId, outcome: "DENIED" });
    return { error: "Accès refusé." };
  }
  const token = generateToken();
  await prisma.episode.update({
    where: { id: episodeId },
    data: {
      tokenHash: hashToken(token),
      linkExpiresAt: new Date(Date.now() + 45 * 86400 * 1000),
    },
  });
  await logAudit(user.id, "REGENERATE_LINK", { objectType: "Episode", objectId: episodeId });
  const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const link = `${base}/s/${token}`;
  const qrDataUrl = await QRCode.toDataURL(link, { width: 280, margin: 2 });
  return { link, qrDataUrl };
}
