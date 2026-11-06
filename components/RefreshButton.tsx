"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export default function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <button className="btn btn-secondary btn-small" disabled={pending} onClick={() => startTransition(() => router.refresh())}>{pending ? "Actualisation…" : "↻ Actualiser"}</button>;
}
