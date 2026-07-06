"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type { CertificationStatus } from "@prisma/client";

// Gestion des praticiens (ADM-01) : création, activation, suspension.

export interface CreatePractitionerState {
  error?: string;
  ok?: boolean;
  tempPassword?: string;
}

export async function createPractitionerAction(
  _prev: CreatePractitionerState,
  formData: FormData
): Promise<CreatePractitionerState> {
  const admin = await requireAdmin();
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  if (!email.includes("@") || !fullName) {
    return { error: "Nom et e-mail valides requis." };
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Un compte existe déjà avec cet e-mail." };

  // Mot de passe provisoire communiqué hors application (e-mail d'invitation en V1.1)
  const tempPassword = crypto.randomUUID().slice(0, 12);
  const user = await prisma.user.create({
    data: {
      email,
      fullName,
      passwordHash: await hashPassword(tempPassword),
      role: "PRACTITIONER",
      certificationStatus: "ACTIVE",
    },
  });
  await logAudit(admin.id, "CREATE_PRACTITIONER", { objectType: "User", objectId: user.id });
  revalidatePath("/admin/praticiens");
  return { ok: true, tempPassword };
}

export async function setPractitionerStatusAction(userId: string, status: string): Promise<void> {
  const admin = await requireAdmin();
  await prisma.user.update({
    where: { id: userId, role: "PRACTITIONER" },
    data: { certificationStatus: status as CertificationStatus },
  });
  await logAudit(admin.id, "SET_PRACTITIONER_STATUS", {
    objectType: "User",
    objectId: userId,
    detail: status,
  });
  revalidatePath("/admin/praticiens");
}
