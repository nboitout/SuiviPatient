"use client";

import { useActionState } from "react";
import { resetPractitionerPasswordAction, type ResetPasswordState } from "@/app/admin/actions";

export default function ResetPractitionerPassword({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState<ResetPasswordState>(
    resetPractitionerPasswordAction.bind(null, userId),
    {}
  );

  if (state.tempPassword) {
    return (
      <span className="notice-ok" style={{ padding: "4px 10px", borderRadius: 3, fontSize: "0.82rem", display: "inline-block" }}>
        Provisoire : <strong>{state.tempPassword}</strong>
      </span>
    );
  }

  return (
    <form action={formAction} style={{ display: "inline" }}>
      <button className="btn btn-secondary btn-small" type="submit" disabled={pending}>
        {pending ? "…" : "Réinitialiser le mot de passe"}
      </button>
      {state.error && <span className="field-error"> {state.error}</span>}
    </form>
  );
}
