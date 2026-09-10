/**
 * Os expositores do Salão Abrasel 2026.
 *
 * Fonte: o mapa de bolso oficial do evento (mapa_de_bolso_v2), lista
 * "EXPOSITORES" — 72 nomes, transcritos como impressos. O PDF é vetorizado
 * (nenhum texto extraível), então a lista foi lida da página renderizada.
 *
 * `x`/`y` são coordenadas NORMALIZADAS (0..1) sobre a mesma planta usada pelo
 * mapa (app/assets/planta-salao-h.png), medidas no centro do stand desenhado.
 * Só existem para quem tem stand identificável no desenho: 49 dos 72. Os
 * outros 23 aparecem na lista sem levar ao mapa — o impresso não diz onde
 * ficam, e chutar uma posição num mapa de evento é pior que não ter.
 */
export interface Expositor {
  /** Identificador estável — não muda se o nome for corrigido. */
  key: string;
  /** Nome como impresso no material oficial. */
  nome: string;
  /** Posição na planta, quando o stand é identificável no desenho. */
  x?: number;
  y?: number;
  /**
   * Como o nome aparece DESENHADO na planta, quando difere do impresso na
   * lista. Serve para quem procura pelo que está vendo no chão do salão.
   */
  nomeNaPlanta?: string;
}

export const EXPOSITORES: Expositor[] = [
  { key: "99-food", nome: "99 Food", x: 0.196, y: 0.763 },
  { key: "alelo", nome: "Alelo", x: 0.55, y: 0.34 },
  { key: "altec", nome: "Altec", x: 0.712, y: 0.102 },
  { key: "ambev", nome: "Ambev", x: 0.305, y: 0.478 },
  { key: "banco-do-brasil-cielo", nome: "Banco do Brasil Cielo", x: 0.778, y: 0.522 },
  { key: "bares-sp", nome: "Bares SP" },
  { key: "bidfood", nome: "Bidfood", x: 0.788, y: 0.269 },
  { key: "chef-ai", nome: "Chef.ai" },
  { key: "chef-control", nome: "Chef Control", x: 0.819, y: 0.757 },
  { key: "colibri", nome: "Colibri", x: 0.326, y: 0.762 },
  { key: "conciliadora", nome: "Conciliadora", x: 0.725, y: 0.102 },
  { key: "conta-clara", nome: "Conta Clara" },
  { key: "control-bpo", nome: "Control BPO", x: 0.686, y: 0.102 },
  { key: "cotacompras", nome: "Cotacompras" },
  { key: "deliveryvip", nome: "DeliveryVIP" },
  { key: "dpen", nome: "DPEN" },
  { key: "figa", nome: "Figa", x: 0.862, y: 0.79 },
  { key: "fixe-crm-fidelidade", nome: "Fixe CRM & Fidelidade" },
  { key: "fixee", nome: "Fixee" },
  { key: "frescatto", nome: "Frescatto", x: 0.789, y: 0.198 },
  { key: "gelopar", nome: "Gelopar", x: 0.885, y: 0.757 },
  { key: "gerenciar", nome: "Gerenciar" },
  { key: "glasart", nome: "Glasart", x: 0.636, y: 0.736 },
  { key: "google-samsung", nome: "Google Samsung", x: 0.926, y: 0.163 },
  { key: "goomer", nome: "Goomer", x: 0.274, y: 0.72 },
  { key: "grand-cru", nome: "Grand Cru", x: 0.851, y: 0.723 },
  { key: "grupo-pleno", nome: "Grupo Pleno", x: 0.322, y: 0.172 },
  { key: "hs-marketing", nome: "HS Marketing", x: 0.649, y: 0.102, nomeNaPlanta: "HS" },
  { key: "ifood", nome: "iFood", x: 0.949, y: 0.766 },
  { key: "infinite", nome: "Infinite" },
  { key: "itw", nome: "ITW", x: 0.754, y: 0.412 },
  { key: "keeta", nome: "Keeta", x: 0.52, y: 0.496 },
  { key: "kikkoman", nome: "Kikkoman" },
  // A lista impressa escreve "MACOM"; a planta desenha "MACON". Confirmado
  // com a organização que o correto é Macom.
  { key: "macom", nome: "Macom", x: 0.754, y: 0.517, nomeNaPlanta: "MACON" },
  { key: "macrocont", nome: "Macrocont", x: 0.607, y: 0.736 },
  { key: "marketup", nome: "MarketUp", x: 0.517, y: 0.736, nomeNaPlanta: "MARKET UP" },
  { key: "middleby-do-brasil", nome: "Middleby do Brasil", x: 0.274, y: 0.795, nomeNaPlanta: "MIDDLEBY" },
  { key: "moncoc", nome: "Moncoc" },
  { key: "natural-bot", nome: "Natural Bot" },
  { key: "nayax-brasil", nome: "Nayax Brasil Ltda", x: 0.67, y: 0.102, nomeNaPlanta: "NAYAX" },
  { key: "nodus", nome: "Nodus", x: 0.489, y: 0.776 },
  { key: "nogueira-brinquedos", nome: "Nogueira Brinquedos", x: 0.155, y: 0.478 },
  { key: "nsf", nome: "NSF" },
  { key: "olaclick", nome: "Olaclick" },
  { key: "pagbank", nome: "PagBank", x: 0.805, y: 0.412 },
  { key: "pdv-legal", nome: "PDV Legal", x: 0.59, y: 0.736 },
  { key: "plasutil", nome: "Plasútil", x: 0.754, y: 0.269 },
  { key: "pluxee", nome: "Pluxee", x: 0.487, y: 0.134 },
  { key: "prefeitura-sp", nome: "Prefeitura SP", x: 0.926, y: 0.469, nomeNaPlanta: "PREFEITURA SÃO PAULO" },
  { key: "prime-interway", nome: "Prime Interway", x: 0.84, y: 0.79, nomeNaPlanta: "PRIME" },
  { key: "processoalerta", nome: "ProcessoAlerta" },
  { key: "rapiboy", nome: "Rapiboy", x: 0.534, y: 0.736 },
  { key: "rational", nome: "Rational", x: 0.754, y: 0.198 },
  { key: "rebal", nome: "Rebal", x: 0.563, y: 0.736 },
  { key: "safra", nome: "Safra" },
  { key: "santander-getnet", nome: "Santander Getnet", x: 0.823, y: 0.23 },
  { key: "sebrae", nome: "Sebrae", x: 0.131, y: 0.175 },
  { key: "stone", nome: "Stone", x: 0.752, y: 0.766 },
  { key: "strikes-solucoes", nome: "Strikes Soluções" },
  { key: "super-gestor", nome: "Super Gestor" },
  { key: "svb", nome: "SVB" },
  { key: "tagme", nome: "Tagme", x: 0.807, y: 0.517 },
  { key: "teknisa", nome: "Teknisa", x: 0.778, y: 0.421 },
  { key: "ticket", nome: "Ticket", x: 0.528, y: 0.287 },
  { key: "toledo-do-brasil", nome: "Toledo do Brasil", x: 0.728, y: 0.469, nomeNaPlanta: "TOLEDO" },
  { key: "touk", nome: "Touk" },
  { key: "transire", nome: "Transire" },
  { key: "tt-co", nome: "TT & CO", x: 0.699, y: 0.102, nomeNaPlanta: "TT&CO" },
  { key: "unox-brasil", nome: "Unox Brasil", x: 0.83, y: 0.46, nomeNaPlanta: "UNOX" },
  { key: "vem", nome: "VEM" },
  { key: "vr", nome: "VR", x: 0.509, y: 0.247 },
  { key: "wyda-embalagens", nome: "Wyda Embalagens", x: 0.676, y: 0.736, nomeNaPlanta: "WYDA" },
];

/** Só os que dá para levar ao mapa. */
export function temLocalizacao(e: Expositor): e is Expositor & { x: number; y: number } {
  return e.x != null && e.y != null;
}

export function acharExpositor(key: string): Expositor | undefined {
  return EXPOSITORES.find((e) => e.key === key);
}
