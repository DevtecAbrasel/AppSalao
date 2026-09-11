import { z } from "zod";

const email = z.string().trim().toLowerCase().email("E-mail inválido");
const password = z.string().min(8, "A senha precisa ter pelo menos 8 caracteres");

export const authBodySchema = z.object({ email, password });

// Redefinição direta: o e-mail localiza a conta e a senha é a nova. A
// confirmação ("digite de novo") é conferida na tela, não aqui — o servidor
// recebe um valor só, e repetir a comparação no corpo da requisição não
// acrescentaria garantia nenhuma.
export const resetPasswordBodySchema = z.object({ email, password });
