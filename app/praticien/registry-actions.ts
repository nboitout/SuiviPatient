"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requirePractitioner } from "@/lib/auth";
import {
  parseProfile,
  parseSession,
  readJson,
  RegistryValidationError,
} from "@/lib/registry";
import {
  savePractitionerProfile,
  recordTreatmentSession,
  reassignEpisodePatient,
} from "@/lib/registry-records";

export interface RegistryActionState {
  error?: string;
  ok?: boolean;
}

function message(error: unknown) {
  if (error instanceof RegistryValidationError) return error.message;
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  )
    return "Ce numéro de séance existe déjà. Rechargez la page avant de saisir une autre séance.";
  throw error;
}

export async function saveProfileAction(
  _previous: RegistryActionState,
  form: FormData,
): Promise<RegistryActionState> {
  const user = await requirePractitioner();
  try {
    await savePractitionerProfile(user.id, parseProfile(form));
  } catch (error) {
    return { error: message(error) };
  }
  revalidatePath("/praticien/compte");
  revalidatePath("/admin/praticiens");
  return { ok: true };
}

export async function addSessionAction(
  episodeId: string,
  _previous: RegistryActionState,
  form: FormData,
): Promise<RegistryActionState> {
  const user = await requirePractitioner();
  try {
    const { patientId } = await recordTreatmentSession(
      user.id,
      episodeId,
      parseSession(readJson(form.get("session"), "Séance")),
    );
    revalidatePath(`/praticien/patient/${patientId}`);
  } catch (error) {
    return { error: message(error) };
  }
  revalidatePath(`/praticien/episode/${episodeId}`);
  revalidatePath("/praticien");
  revalidatePath("/praticien/patients");
  return { ok: true };
}

export async function linkEpisodePatientAction(
  episodeId: string,
  _previous: RegistryActionState,
  form: FormData,
): Promise<RegistryActionState> {
  const user = await requirePractitioner();
  if (form.get("confirmLink") !== "on")
    return { error: "Confirmez qu’il s’agit bien du même patient." };
  const patientId = form.get("patientId");
  if (typeof patientId !== "string" || !patientId || patientId.length > 100)
    return { error: "Choisissez un patient." };
  try {
    const previousId = await reassignEpisodePatient(
      user.id,
      episodeId,
      patientId,
    );
    revalidatePath(`/praticien/patient/${previousId}`);
  } catch (error) {
    return { error: message(error) };
  }
  revalidatePath(`/praticien/patient/${patientId}`);
  revalidatePath(`/praticien/episode/${episodeId}`);
  revalidatePath("/praticien/patients");
  revalidatePath("/praticien");
  return { ok: true };
}
