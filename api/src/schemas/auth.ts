import { z } from "zod";

const email = z.string().trim().toLowerCase().email("E-mail inválido");
const password = z.string().min(8, "A senha precisa ter pelo menos 8 caracteres");

export const authBodySchema = z.object({ email, password });

export const forgotPasswordBodySchema = z.object({ email });

export const resetPasswordBodySchema = z.object({
  token: z.string().min(1, "Token de recuperação ausente"),
  password,
});
