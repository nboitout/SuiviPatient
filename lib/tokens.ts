import { createHash, randomBytes } from "crypto";

// Jetons patient à haute entropie (SEC-05).
// Seul le hash SHA-256 est stocké en base : un dump de la base
// ne permet pas de reconstituer les liens patients actifs.

export function generateToken(): string {
  return randomBytes(24).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
