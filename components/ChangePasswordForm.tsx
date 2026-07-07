"use client";

import { useActionState } from "react";
import { changeOwnPasswordAction, type ChangePasswordState } from "@/app/praticien/actions";

export default function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<ChangePasswordState, FormData>(
    changeOwnPasswordAction,
    {}
  );

  return (
    <form action={formAction}>
      <div className="field">
        <label htmlFor="current">Mot de passe actuel</label>
        <input id="current" name="current" type="password" autoComplete="current-password" required />
      </div>
      <div className="field">
        <label htmlFor="next">Nouveau mot de passe</label>
        <input id="next" name="next" type="password" autoComplete="new-password" minLength={10} required />
        <p className="field-help">Au moins 10 caractères.</p>
      </div>
      <div className="field">
        <label htmlFor="confirm">Confirmer le nouveau mot de passe</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={10} required />
      </div>
      {state.error && (
        <p className="notice notice-danger" role="alert">
          {state.error}
        </p>
      )}
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Modification…" : "Changer mon mot de passe"}
      </button>
      <p className="field-help" style={{ marginTop: 10 }}>
        Après le changement, vous serez déconnecté(e) et devrez vous reconnecter avec le
        nouveau mot de passe.
      </p>
    </form>
  );
}
