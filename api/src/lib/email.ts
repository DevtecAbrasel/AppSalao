import { env } from "../env";

/**
 * Envio de e-mail pela API HTTP do Resend.
 *
 * Chamada direta com `fetch` (nativo no Node 20) em vez do SDK: é um POST com
 * quatro campos, e uma dependência a menos é uma dependência a menos para
 * instalar, auditar e atualizar num serviço que hoje só manda um tipo de
 * mensagem.
 */
const ENDPOINT = "https://api.resend.com/emails";

/** Sem chave, o recurso está desligado — quem chama decide o que dizer. */
export function envioDeEmailConfigurado(): boolean {
  return Boolean(env.RESEND_API_KEY);
}

interface Mensagem {
  to: string;
  subject: string;
  html: string;
  /** Versão em texto puro, para clientes que não mostram HTML. */
  text: string;
}

export async function enviarEmail({ to, subject, html, text }: Mensagem): Promise<void> {
  if (!env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY não configurada");
  }

  const resposta = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, html, text }),
  });

  if (!resposta.ok) {
    // O corpo do erro do Resend diz o motivo (domínio não verificado, chave
    // inválida, destinatário recusado). Vale no log: sem ele, uma falha de
    // configuração vira "não chegou o e-mail" e ninguém sabe por quê.
    const detalhe = await resposta.text().catch(() => "");
    throw new Error(`Resend respondeu ${resposta.status}: ${detalhe.slice(0, 300)}`);
  }
}
