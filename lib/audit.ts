import { prisma } from "./db";

// Journal d'audit (ADM-09 / SEC-07) : connexions, consultations,
// exports, actions sur alertes, modifications de données.

export async function logAudit(
  userId: string | null,
  action: string,
  opts: { objectType?: string; objectId?: string; detail?: string; outcome?: string } = {}
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      objectType: opts.objectType,
      objectId: opts.objectId,
      detail: opts.detail,
      outcome: opts.outcome ?? "OK",
    },
  });
}
