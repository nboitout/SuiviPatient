"use client";

import { useState, useTransition } from "react";
import { setPractitionerStatusAction } from "@/app/admin/actions";

const STATUSES = [
  { value: "PENDING", label: "En attente" },
  { value: "ACTIVE", label: "Actif" },
  { value: "SUSPENDED", label: "Suspendu" },
  { value: "REVOKED", label: "Révoqué" },
];

export default function PractitionerStatusSelect({
  userId,
  current,
}: {
  userId: string;
  current: string;
}) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(current);

  return (
    <select
      aria-label="Statut de certification"
      value={value}
      disabled={pending}
      onChange={(e) => {
        const status = e.target.value;
        setValue(status);
        startTransition(() => setPractitionerStatusAction(userId, status));
      }}
      style={{ minHeight: 36, padding: "4px 8px", width: "auto" }}
    >
      {STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
