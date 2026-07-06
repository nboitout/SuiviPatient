// Création du premier compte administrateur en production.
// Usage : npm run create-admin -- admin@institut.fr "Nom Complet" "MotDePasseFort"

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const [email, fullName, password] = process.argv.slice(2);
  if (!email || !fullName || !password) {
    console.error('Usage : npm run create-admin -- email "Nom Complet" "MotDePasse"');
    process.exit(1);
  }
  if (password.length < 10) {
    console.error("Le mot de passe doit comporter au moins 10 caractères.");
    process.exit(1);
  }
  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase().trim() },
    update: { role: "ADMIN", certificationStatus: "ACTIVE" },
    create: {
      email: email.toLowerCase().trim(),
      fullName,
      passwordHash: await bcrypt.hash(password, 12),
      role: "ADMIN",
      certificationStatus: "ACTIVE",
      protocolAcceptedAt: new Date(),
      protocolVersion: "protocole-v1.0",
    },
  });
  console.log(`Compte administrateur prêt : ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
