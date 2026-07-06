"use client";

// Workflow d'alerte (7.2) : le praticien qualifie chaque alerte.

import { useState, useTransition } from "react";
import { updateAlertAction } from "@/app/praticien/actions";

const ACTIONS: { value: string; label: string }[] = [
  { value: "ACKNOWLEDGED", label: "Vue" },
  { value: "PATIENT_CONTACTED", label: "Patient contacté" },
  { value: "REFERRAL_ADVISED", label: "Orientation médicale conseillée" },
  { value: "UNDER_MEDICAL_FOLLOWUP", label: "Déjà suivi médicalement" },
  { value: "RESOLVED", label: "Clôturer" },
  { value: "FALSE_POSITIVE", label: "Faux positif" },
];

export default function AlertActions({ alertId, current }: { alertId: string; current: string }) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(current);

  return (
    <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
      <select
        aria-label="Qualifier l'alerte"
        value={value}
        disabled={pending}
        onChange={(e) => {
          const status = e.target.value;
          setValue(status);
          startTransition(() => updateAlertAction(alertId, status));
        }}
        style={{ minHeight: 36, padding: "4px 8px", width: "auto" }}
      >
        <option value="NEW" disabled>
          Nouvelle
        </option>
        {ACTIONS.map((a) => (
          <option key={a.value} value={a.value}>
            {a.label}
          </option>
        ))}
      </select>
    </span>
  );
}
