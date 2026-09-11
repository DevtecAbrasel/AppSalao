import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../env";

const SALT_ROUNDS = 10;
const TOKEN_EXPIRES_IN = "30d";
const RESET_EXPIRES_IN = "1h";

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(userId: string): string {
  return jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: TOKEN_EXPIRES_IN });
}

export function verifyToken(token: string): { userId: string } {
  const payload = jwt.verify(token, env.JWT_SECRET);

  if (typeof payload !== "object" || typeof payload.userId !== "string") {
    throw new Error("Token payload inválido");
  }

  return { userId: payload.userId };
}

/**
 * Impressão digital da senha atual. Vai dentro do token de recuperação e é
 * conferida de novo na hora de trocar a senha: como o hash muda quando a
 * senha muda, um link já usado deixa de bater e para de valer.
 *
 * É o que dá uso único ao link SEM uma tabela de tokens — e sem tabela não há
 * migração, que é o que este projeto não pode fazer com o evento no ar. Não
 * expõe nada: é um resumo de um hash, não da senha.
 */
function digitalDaSenha(passwordHash: string): string {
  return crypto.createHash("sha256").update(passwordHash).digest("hex").slice(0, 32);
}

/** Token de uso único, válido por uma hora, que só serve para trocar a senha. */
export function signPasswordResetToken(userId: string, passwordHash: string): string {
  return jwt.sign(
    // `kind` separa este token do token de sessão: sem ele, um link de
    // recuperação valeria como login em qualquer rota autenticada.
    { userId, kind: "password_reset", fp: digitalDaSenha(passwordHash) },
    env.JWT_SECRET,
    { expiresIn: RESET_EXPIRES_IN }
  );
}

/** Lança se o token for inválido, expirado, de outro tipo ou já utilizado. */
export function verifyPasswordResetToken(
  token: string,
  passwordHashAtual: string | null
): { userId: string } {
  const payload = jwt.verify(token, env.JWT_SECRET);

  if (
    typeof payload !== "object" ||
    payload.kind !== "password_reset" ||
    typeof payload.userId !== "string" ||
    typeof payload.fp !== "string"
  ) {
    throw new Error("Token de recuperação inválido");
  }

  if (passwordHashAtual !== null && payload.fp !== digitalDaSenha(passwordHashAtual)) {
    throw new Error("Token de recuperação já utilizado");
  }

  return { userId: payload.userId };
}
