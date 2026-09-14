/**
 * Os estandes compartilhados da planta.
 *
 * Um estande compartilhado é UM espaço com várias empresas dentro. Por isso
 * ele tem um pino só, e não um por empresa: o desenho não distingue onde cada
 * uma fica lá dentro, e espalhar 16 bolinhas sobre um mesmo retângulo diria
 * uma precisão que não existe. Quem toca o pino recebe a lista inteira.
 *
 * Coordenadas NORMALIZADAS (0..1) sobre a planta horizontal, medidas no
 * centro do bloco desenhado — o mesmo sistema de `pointsOfInterest.ts` e
 * `expositores.ts`.
 *
 * Os nomes estão como a organização os enviou, inclusive as repetições: os
 * três "Moncoc" são posições diferentes dentro do mesmo estande, e juntá-los
 * numa linha só esconderia isso.
 */
export interface EstandeCompartilhado {
  key: string;
  /** Código de 2 letras dentro do pino, como os pontos de interesse. */
  marker: string;
  /** Onde fica, em palavras — é o que o cartão mostra acima da lista. */
  local: string;
  x: number;
  y: number;
  expositores: string[];
}

export const ESTANDES_COMPARTILHADOS: EstandeCompartilhado[] = [
  {
    key: "compartilhado-arena-sebrae",
    marker: "EC",
    local: "Acima da Arena Sebrae",
    // Bloco "COMPARTILHADO" medido na planta em x 1252..1950, y 136..528.
    x: 0.2269,
    y: 0.1713,
    expositores: [
      "NATURAL BOT",
      "DELIVERY VIP",
      "BARES SP",
      "COTA COMPRAS",
      "SUPER GESTOR",
      "CHEF AI",
      "NSF",
      "FIXE CRM",
      "STRIKES",
      "FIXEE",
      "GERENCIAR",
      "INFINITE",
      "KIKKOMAN",
      "OLACLICK",
      "SVB",
      "PaySales",
    ],
  },
  {
    key: "compartilhado-caex",
    marker: "EC",
    local: "À direita do CAEX",
    // Bloco "COMPARTILHADO" medido na planta em x 356..713, y 136..528 — a
    // divisória branca para o bloco SEBRAE, ao lado, fica em x 714..719.
    x: 0.0758,
    y: 0.1713,
    expositores: [
      "Moncoc",
      "Moncoc",
      "Moncoc",
      "Dpen",
      "Conta Clara",
      "LUCY",
      "Artesian",
      "ProcessoAlerta",
    ],
  },
];

/** Quantos itens cada coluna da lista recebe. */
export const ITENS_POR_COLUNA = 4;

/**
 * Fatia a lista em colunas de 4, preenchendo COLUNA A COLUNA — a primeira
 * coluna leva os itens 1 a 4, a segunda o 5 a 8, e assim por diante. É a
 * ordem em que a organização numerou, e ler de cima para baixo é o que a
 * pessoa espera de uma lista em colunas.
 */
export function emColunas(itens: string[]): string[][] {
  const colunas: string[][] = [];
  for (let i = 0; i < itens.length; i += ITENS_POR_COLUNA) {
    colunas.push(itens.slice(i, i + ITENS_POR_COLUNA));
  }
  return colunas;
}
