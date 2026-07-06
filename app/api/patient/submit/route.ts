import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findEpisodeByToken, currentOpenTask, scheduleFollowUps } from "@/lib/episodes";
import { FORMS, QUESTIONNAIRE_VERSION, validateAnswers, type Answers } from "@/lib/questionnaires";
import { evaluate } from "@/lib/alerts";

// Soumission patient. Le jeton d'épisode fait office d'authentification.
// Aucune donnée de santé ne peut être enregistrée sans consentement (PAT-03).

export async function POST(req: NextRequest) {
  let body: {
    token?: string;
    kind?: string;
    answers?: Answers;
    consents?: { outcomes: boolean; research: boolean; contact: boolean; contactEmail?: string };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const { token, kind, answers, consents } = body;
  if (!token || !kind || !answers || !FORMS[kind]) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const episode = await findEpisodeByToken(token);
  if (!episode) {
    return NextResponse.json({ error: "Lien invalide ou expiré." }, { status: 404 });
  }

  // Consentement au traitement obligatoire avant toute soumission
  const hasOutcomesConsent =
    episode.consents.some((c) => c.type === "OUTCOMES_MONITORING" && c.granted && !c.withdrawnAt) ||
    consents?.outcomes === true;
  if (!hasOutcomesConsent) {
    return NextResponse.json(
      { error: "Le consentement est requis pour enregistrer vos réponses." },
      { status: 403 }
    );
  }

  // La tâche demandée doit être celle actuellement ouverte
  const completedKinds = episode.responses.map((r) => r.kind as string);
  const task = currentOpenTask(episode.formTasks, completedKinds);
  if (!task || task.kind !== kind) {
    return NextResponse.json(
      { error: "Ce questionnaire n'est pas disponible actuellement." },
      { status: 409 }
    );
  }

  const form = FORMS[kind];
  const validationErrors = validateAnswers(form, answers);
  if (validationErrors.length > 0) {
    return NextResponse.json(
      { error: "Certaines réponses sont manquantes ou invalides.", fields: validationErrors },
      { status: 422 }
    );
  }

  const userAgent = req.headers.get("user-agent")?.slice(0, 255) ?? null;

  // Enregistrement des consentements donnés lors de cette soumission
  if (consents) {
    const records: { type: "OUTCOMES_MONITORING" | "CONTACT_REMINDERS" | "AGGREGATED_RESEARCH"; granted: boolean }[] = [
      { type: "OUTCOMES_MONITORING", granted: consents.outcomes },
      { type: "AGGREGATED_RESEARCH", granted: consents.research },
      { type: "CONTACT_REMINDERS", granted: consents.contact },
    ];
    await prisma.consentRecord.createMany({
      data: records.map((r) => ({
        episodeId: episode.id,
        type: r.type,
        version: QUESTIONNAIRE_VERSION,
        granted: r.granted,
        userAgent,
      })),
    });

    if (consents.contact) {
      const email = consents.contactEmail?.trim().slice(0, 254);
      await prisma.patientContact.upsert({
        where: { episodeId: episode.id },
        create: { episodeId: episode.id, email: email || null, contactConsent: true },
        update: { ...(email ? { email } : {}), contactConsent: true },
      });
    }
  }

  // Réponse + clôture de la tâche
  const response = await prisma.questionnaireResponse.create({
    data: {
      episodeId: episode.id,
      formTaskId: task.id,
      kind: task.kind,
      questionnaireVersion: QUESTIONNAIRE_VERSION,
      answers: JSON.stringify(answers),
    },
  });
  await prisma.formTask.update({ where: { id: task.id }, data: { status: "COMPLETED" } });

  // Moteur d'alertes (section 7)
  const candidates = evaluate(kind, answers);
  if (candidates.length > 0) {
    await prisma.alert.createMany({
      data: candidates.map((c) => ({
        episodeId: episode.id,
        type: c.type,
        severity: c.severity,
        detail: c.detail,
      })),
    });
  }

  // Après T0 : planification D2 / D21 + rappels si consentement contact
  if (kind === "T0") {
    await scheduleFollowUps(episode.id, new Date());
  }

  // J21 rempli → épisode terminé
  if (kind === "D21") {
    await prisma.episode.update({ where: { id: episode.id }, data: { status: "COMPLETED" } });
  }

  return NextResponse.json({
    ok: true,
    responseId: response.id,
    safetyMessages: candidates.map((c) => c.patientMessage).filter((m, i, a) => a.indexOf(m) === i),
  });
}
