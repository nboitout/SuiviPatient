import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import ProfessionalLogin from "@/components/ProfessionalLogin";

export default async function PractitionerLoginPage({ searchParams }: {
  searchParams: Promise<{ pw?: string }>;
}) {
  const user = await currentUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/praticien");
  const { pw } = await searchParams;
  return <ProfessionalLogin mode="practitioner" passwordChanged={pw === "changed"} />;
}
