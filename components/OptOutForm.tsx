"use client";

import { useState } from "react";

export default function OptOutForm({ token }: { token: string }) {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function optOut() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/patient/optout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
    } catch {
      setError("Une erreur est survenue. Merci de réessayer.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return <p className="notice notice-ok">C&apos;est fait : vous ne recevrez plus de rappels.</p>;
  }

  return (
    <div>
      <p>
        Vous ne recevrez plus de rappels par e-mail ou SMS pour ce suivi. Vous pourrez
        toujours répondre aux questionnaires via votre lien si vous le souhaitez.
      </p>
      {error && <p className="notice notice-danger">{error}</p>}
      <button className="btn" onClick={optOut} disabled={busy}>
        {busy ? "Un instant…" : "Confirmer l'arrêt des rappels"}
      </button>
    </div>
  );
}
