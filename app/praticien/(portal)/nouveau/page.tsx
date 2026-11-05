import CreateEpisodeForm from "@/components/CreateEpisodeForm";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requirePractitioner } from "@/lib/auth";

export default async function NewEpisodePage({
  searchParams,
}: {
  searchParams: Promise<{ patient?: string }>;
}) {
  const user = await requirePractitioner();
  const { patient } = await searchParams;
  const [patients, profileCount] = await Promise.all([
    prisma.patient.findMany({
      where: { practitionerId: user.id },
      select: { id: true, code: true, ageBand: true, sex: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.practitionerProfileVersion.count({
      where: { practitionerId: user.id },
    }),
  ]);
  return (
    <>
      <h1>Créer un épisode de suivi</h1>
      <p className="muted" style={{ maxWidth: 640 }}>
        Un épisode suit un problème au fil de plusieurs séances. Choisissez un
        patient existant ou créez son code, puis renseignez le contexte et la
        première séance. Conservez la correspondance entre ce code et l’identité
        dans votre dossier local.
      </p>
      {profileCount === 0 ? (
        <div className="notice notice-info">
          Renseignez d’abord votre profil professionnel pour documenter les
          séances. <Link href="/praticien/compte">Compléter mon profil</Link>
        </div>
      ) : null}
      <CreateEpisodeForm
        patients={patients}
        initialPatientId={
          patients.some((p) => p.id === patient) ? patient! : ""
        }
        today={new Date().toISOString().slice(0, 10)}
        protocolVersion={user.protocolVersion ?? "protocole-v1.0"}
      />
    </>
  );
}
