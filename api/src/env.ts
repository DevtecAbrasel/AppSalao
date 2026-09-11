import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatório"),
  PORT: z.coerce.number().default(3333),
  APP_API_KEY: z.string().min(1, "APP_API_KEY é obrigatório"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET deve ter pelo menos 16 caracteres"),

  // --- Recuperação de senha por e-mail ---
  // Opcionais de propósito: sem a chave, a API sobe igual e só o "esqueci
  // minha senha" fica desligado (respondendo que não está disponível). Isso
  // mantém o ambiente local e a produção rodando sem obrigar ninguém a ter
  // uma conta de envio configurada.
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Salão Abrasel <onboarding@resend.dev>"),
  /** Base dos links do e-mail — é onde o app está publicado. */
  APP_PUBLIC_URL: z.string().url().default("https://appsalao.abrasel.xyz"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variáveis de ambiente inválidas:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
