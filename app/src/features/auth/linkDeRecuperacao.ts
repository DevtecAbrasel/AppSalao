import { Platform } from "react-native";

/**
 * O token que vem no link do e-mail de recuperação (`/?reset=...`).
 *
 * Por que a query e não uma rota: o app é uma página só — o React Navigation
 * roda sem configuração de links, então `/redefinir-senha` não existiria como
 * endereço e um F5 ali daria 404 no servidor estático. A query chega na mesma
 * página de sempre, e quem decide o que fazer com ela é a pilha de entrada.
 *
 * Lido uma vez, no carregamento do módulo: depois disso a URL é limpa, e
 * reler daria vazio.
 */
const TOKEN_INICIAL = lerDaUrl();

function lerDaUrl(): string | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  try {
    const token = new URL(window.location.href).searchParams.get("reset");
    return token && token.trim() ? token : null;
  } catch {
    return null;
  }
}

export function tokenDeRecuperacaoNaAbertura(): string | null {
  return TOKEN_INICIAL;
}

/**
 * Tira o token do endereço.
 *
 * Sem isso, um F5 depois de trocar a senha tentaria usar o mesmo link de
 * novo — que já não vale — e a pessoa cairia numa tela de erro sem entender
 * por quê. Também evita o token ficar no histórico do navegador.
 */
export function limparTokenDaUrl(): void {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("reset")) return;
    url.searchParams.delete("reset");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  } catch {
    // Navegador sem History API: o token continua no endereço, o que é feio
    // mas não quebra nada — o servidor já o recusa na segunda tentativa.
  }
}
