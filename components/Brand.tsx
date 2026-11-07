import Link from "next/link";
import Image from "next/image";
import logo from "@/public/brand/suivi-patient-logo.png";

export default function Brand() {
  return (
    <Link href="/" className="rop-brand" aria-label="Suivi Patient ROP — accueil">
      <Image src={logo} alt="" width={39} height={39} className="rop-mark" unoptimized />
      <span>Suivi Patient<small>Institut R.O.P.</small></span>
    </Link>
  );
}
