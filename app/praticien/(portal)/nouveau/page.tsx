import CreateEpisodeForm from "@/components/CreateEpisodeForm";

export default function NewEpisodePage() {
  return (
    <>
      <h1>Créer un suivi patient</h1>
      <p className="muted" style={{ maxWidth: 640 }}>
        Renseignez la séance, puis remettez au patient le lien sécurisé ou le QR code généré.
        Aucun nom de patient n&apos;est enregistré dans le registre : utilisez votre dossier
        local habituel pour faire le lien si nécessaire.
      </p>
      <CreateEpisodeForm />
    </>
  );
}
