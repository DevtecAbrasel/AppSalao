import { Request } from "express";
import rateLimit from "express-rate-limit";

// Limite global: rede de evento presencial, nao trafego generico de
// internet. Centenas/milhares de pessoas legitimas podem compartilhar o
// mesmo IP publico via NAT do Wi-Fi do local — um limite pensado para
// "1 pessoa por IP" derrubaria o evento inteiro no primeiro minuto de uso
// normal (o app sozinho gera ~1 req/min por usuario so de polling de
// notificacoes, sem contar abertura de tela, favoritos etc.).
//
// Por isso o valor aqui e alto o suficiente para nunca ser atingido por uso
// normal de uma rede cheia de gente (assumindo ordem de grandeza de alguns
// milhares de usuarios simultaneos atras do mesmo IP), servindo so como
// ultima barreira contra um script de flood de verdade — nao contra o
// volume esperado do proprio publico do evento.
export const globalRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 6000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas requisicoes. Tente novamente em breve." },
});

// Limite das rotas de autenticacao, keyed por E-MAIL (nao por IP).
//
// Motivo: o evento acontece com muita gente na mesma rede (Wi-Fi do local),
// entao varias pessoas de verdade compartilham o mesmo IP publico via NAT.
// Um limite por IP faria a rede inteira competir pelo mesmo contador — um
// pico normal de logins no inicio do evento bloquearia gente que nunca
// errou senha nenhuma. Por email, cada conta tem seu proprio contador: uma
// tentativa de forca bruta contra UMA conta continua sendo travada, mas nao
// arrasta o resto da rede junto.
//
// Sem e-mail no corpo (payload malformado), cai pro IP como fallback —
// ainda assim precisa de algum limite para nao ficar totalmente aberto.
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : null;
    return email || req.ip || "unknown";
  },
  message: { error: "Muitas tentativas. Tente novamente em alguns minutos." },
});