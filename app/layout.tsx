import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";

// Polices de la charte graphique guy-boitout.com, auto-hébergées via next/font
// (aucune requête vers un CDN tiers depuis le navigateur du patient — PRI-09).
const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const sans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Suivi Patient R.O.P.",
  description:
    "Webapp de suivi patient après séance ROP — questionnaires courts, sécurisés, sans installation.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${sans.variable} ${serif.variable}`}>{children}</body>
    </html>
  );
}
