import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePractitioner } from "@/lib/auth";
import AddTreatmentSessionForm from "@/components/AddTreatmentSessionForm";

export default async function NewSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requirePractitioner();
  const { id } = await params;
  const episode = await prisma.episode.findFirst({
    where: { id, practitionerId: user.id },
    include: {
      patient: { select: { code: true } },
      treatmentSessions: {
        select: { sessionIndex: true },
        orderBy: { sessionIndex: "desc" },
        take: 1,
      },
    },
  });
  if (!episode || episode.status === "REVOKED") notFound();
  return (
    <>
      <p>
        <Link href={`/praticien/episode/${id}`}>← Revenir à l’épisode</Link>
      </p>
      <h1>Ajouter une séance</h1>
      <p className="muted patient-code">
        Patient {episode.patient.code} · Les questionnaires restent rattachés à
        cet épisode de soins.
      </p>
      <p className="muted">
        Vérifiez que votre{" "}
        <Link href="/praticien/compte">profil professionnel</Link> décrit bien
        votre situation à la date de cette séance.
      </p>
      <AddTreatmentSessionForm
        episodeId={id}
        nextIndex={(episode.treatmentSessions[0]?.sessionIndex ?? 0) + 1}
        today={new Date().toISOString().slice(0, 10)}
        protocolVersion={user.protocolVersion ?? "protocole-v1.0"}
      />
    </>
  );
}
