import { requirePractitioner } from "@/lib/auth";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import PractitionerProfileForm from "@/components/PractitionerProfileForm";
import { prisma } from "@/lib/db";
import { CERTIFICATION_LABELS, trainingsAtDate } from "@/lib/registry";

export default async function AccountPage() {
  const user = await requirePractitioner();
  const [profile, history] = await Promise.all([
    prisma.practitionerProfileVersion.findFirst({
      where: { practitionerId: user.id },
      orderBy: [
        { effectiveFrom: "desc" },
        { recordedAt: "desc" },
        { id: "desc" },
      ],
    }),
    prisma.certificationEvent.findMany({
      where: { practitionerId: user.id },
      orderBy: [{ effectiveFrom: "desc" }, { recordedAt: "desc" }],
    }),
  ]);

  return (
    <>
      <h1>Mon compte</h1>
      {user.role === "PRACTITIONER" ? (
        <PractitionerProfileForm
          today={new Date().toISOString().slice(0, 10)}
          profile={
            profile
              ? {
                  professionalBackground: profile.professionalBackground,
                  practiceSetting: profile.practiceSetting,
                  ropStartedYear: profile.ropStartedYear,
                  monthlyCaseVolume: profile.monthlyCaseVolume,
                  otherModalities: profile.otherModalities,
                  trainings: trainingsAtDate(profile.trainings, new Date()),
                }
              : null
          }
        />
      ) : null}
      <div className="card">
        <h2>Historique de certification</h2>
        <p>
          Statut actuel :{" "}
          <strong>{CERTIFICATION_LABELS[user.certificationStatus]}</strong>. La
          certification est gérée par l’institut.
        </p>
        {history.length ? (
          <ul>
            {history.map((event) => (
              <li key={event.id}>
                {event.effectiveFrom.toLocaleDateString("fr-FR", {
                  timeZone: "UTC",
                })}{" "}
                — {CERTIFICATION_LABELS[event.status]}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Historique antérieur non documenté.</p>
        )}
      </div>
      <div className="card" style={{ maxWidth: 480 }}>
        <p className="muted">
          Connecté(e) en tant que <strong>{user.fullName}</strong> ({user.email}
          )
        </p>
        <h2>Changer mon mot de passe</h2>
        <ChangePasswordForm />
      </div>
    </>
  );
}
