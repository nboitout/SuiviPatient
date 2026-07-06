import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findEpisodeByToken } from "@/lib/episodes";

// Opt-out immédiat des rappels (REM-06) : enregistré et effectif tout de suite.

export async function POST(req: NextRequest) {
  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  if (!body.token) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  const episode = await findEpisodeByToken(body.token);
  if (!episode) return NextResponse.json({ error: "Lien invalide." }, { status: 404 });

  await prisma.patientContact.upsert({
    where: { episodeId: episode.id },
    create: { episodeId: episode.id, contactConsent: false, optedOutAt: new Date() },
    update: { contactConsent: false, optedOutAt: new Date() },
  });
  await prisma.reminderTask.updateMany({
    where: { episodeId: episode.id, status: "SCHEDULED" },
    data: { status: "OPT_OUT" },
  });
  await prisma.consentRecord.updateMany({
    where: { episodeId: episode.id, type: "CONTACT_REMINDERS", granted: true, withdrawnAt: null },
    data: { withdrawnAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
