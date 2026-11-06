import Link from "next/link";

export default function Brand() {
  return (
    <Link href="/" className="rop-brand" aria-label="Suivi Patient ROP — accueil">
      <span className="rop-mark" aria-hidden="true">ROP</span>
      <span>Suivi Patient<small>Institut R.O.P.</small></span>
    </Link>
  );
}
