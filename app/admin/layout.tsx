import type { Metadata } from "next";

export const metadata: Metadata = { title: "Administration — Suivi Patient R.O.P." };

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
