import type { Metadata } from "next";
import Link from "next/link";
import PatientFlow from "@/components/PatientFlow";
import { FORMS } from "@/lib/questionnaires";

export const metadata: Metadata = {
  title: "Aperçu des questionnaires — Suivi Patient R.O.P.",
  robots: { index: false, follow: true },
};

const choices = [
  { kind: "T0", label: "Questionnaire initial" },
  { kind: "D2", label: "Suivi à 48 h" },
  { kind: "D21", label: "Bilan à 3 semaines" },
];

export default async function QuestionnairePreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ questionnaire?: string }>;
}) {
  const { questionnaire } = await searchParams;
  const kind = questionnaire === "D2" || questionnaire === "D21" ? questionnaire : "T0";
  return (
    <main className="container" style={{ paddingTop: 24 }}>
      <p><Link href="/">← Retour à l’accueil</Link></p>
      <div className="notice notice-info">
        <strong>Aperçu — aucune réponse enregistrée.</strong>
        <p>
          Découvrez les questions avec des réponses fictives. Cet aperçu ne crée
          aucun suivi et n’envoie rien à un praticien. Pour remplir votre propre
          questionnaire, utilisez votre lien personnel ou votre QR code.
        </p>
      </div>
      <nav className="action-row" aria-label="Choisir un questionnaire à découvrir">
        {choices.map((choice) => (
          <Link
            key={choice.kind}
            href={`/questionnaires/apercu?questionnaire=${choice.kind}`}
            className={kind === choice.kind ? "btn" : "btn btn-secondary"}
            aria-current={kind === choice.kind ? "page" : undefined}
          >
            {choice.label}
          </Link>
        ))}
      </nav>
      <PatientFlow key={kind} form={FORMS[kind]} preview />
    </main>
  );
}
