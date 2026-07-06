"use client";

import { useActionState } from "react";
import { createPractitionerAction, type CreatePractitionerState } from "@/app/admin/actions";

export default function CreatePractitionerForm() {
  const [state, formAction, pending] = useActionState<CreatePractitionerState, FormData>(
    createPractitionerAction,
    {}
  );

  return (
    <form action={formAction}>
      <div className="field">
        <label htmlFor="fullName">Nom complet</label>
        <input id="fullName" name="fullName" type="text" required maxLength={120} />
      </div>
      <div className="field">
        <label htmlFor="p-email">Adresse e-mail</label>
        <input id="p-email" name="email" type="email" required />
      </div>
      {state.error && (
        <p className="notice notice-danger" role="alert">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="notice notice-ok">
          Compte créé (statut : actif). Mot de passe provisoire à transmettre de façon
          sécurisée : <strong>{state.tempPassword}</strong>
        </p>
      )}
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Création…" : "Créer le compte"}
      </button>
    </form>
  );
}
