import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../env";

const SALT_ROUNDS = 10;
const TOKEN_EXPIRES_IN = "30d";

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
