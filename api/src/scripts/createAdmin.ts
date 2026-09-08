// Cria ou promove a conta de administrador.
//
//   ADMIN_EMAIL=voce@exemplo.com ADMIN_PASSWORD='senha-forte' npm run admin:create
//
// As credenciais vêm do ambiente de propósito: nada de e-mail ou senha
// versionado no repositório. Se a conta já existir, o script só promove (e
// troca a senha se ADMIN_PASSWORD for informada) — nunca cria duplicata.
import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/auth";

async function main(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!email) {
    throw new Error("Defina ADMIN_EMAIL (ex: ADMIN_EMAIL=voce@exemplo.com npm run admin:create)");
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    const user = await prisma.user.update({
      where: { email },
      data: {
        role: "ADMIN",
        ...(password ? { passwordHash: await hashPassword(password) } : {}),
      },
      select: { id: true, email: true, role: true },
    });

    console.log(`Conta existente promovida a ADMIN: ${user.email}`);
    if (password) console.log("Senha atualizada.");
    else console.log("Senha mantida (informe ADMIN_PASSWORD para trocá-la).");
    return;
  }

  if (!password) {
    throw new Error("Conta nova exige ADMIN_PASSWORD (mínimo 8 caracteres)");
  }
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD deve ter pelo menos 8 caracteres");
  }

  const user = await prisma.user.create({
    data: { email, passwordHash: await hashPassword(password), role: "ADMIN" },
    select: { id: true, email: true, role: true },
  });

  console.log(`Administrador criado: ${user.email}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
