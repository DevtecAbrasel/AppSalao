import { ContentSize, Point, ViewportSize } from "./zoomMath";

// A planta de 2026, recortada do PDF vetorial do Salão (Mapa-MAP-01),
// página 1, x=150 y=765 w=3150 h=865 pt, a 2,24x.
//
// Uma imagem só, na orientação original. Girar o arquivo foi tentado e
// descartado: os nomes dos stands vêm CONVERTIDOS EM CURVAS no PDF (a página
// inteira tem um único texto de verdade, "VOCÊ ESTÁ AQUI"), então girar a
// imagem não reorienta nada — só troca quais nomes ficam deitados. O que
// resolve leitura em celular é enquadramento e navegação, não rotação.
export const PLANTA = {
  image: require("../../../assets/planta-salao-h.png"),
  width: 7056,
  height: 1938,
};

/**
 * Os dois enquadramentos que o mapa oferece, alternados pelo botão da tela.
 * Existem os dois porque servem a perguntas diferentes.
 *
 * - "classico" (rótulo "Tela cheia"): a planta sempre COBRE a viewport, então
 *   nunca sobra fundo vazio e os nomes saem no maior tamanho possível. É a
 *   visão de quem já sabe onde está e quer ler. O preço é não conseguir
 *   afastar: num celular em pé o zoom mínimo mostra ~18% da planta.
 * - "portrait" (rótulo "Ver planta inteira"): o zoom mínimo passa a ser "a
 *   planta inteira cabendo na tela" e aparecem os atalhos de região. É a
 *   visão de quem está tentando se situar no salão.
 */
export type ModoMapa = "classico" | "portrait";

export interface RegiaoPlanta {
  key: string;
  label: string;
  /** Retângulo em coordenadas normalizadas (0..1) da planta. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

// Regiões usadas pelos atalhos. Não precisam cobrir a planta inteira nem ser
// disjuntas — são destinos de navegação, do jeito que alguém pediria uma
// informação ("onde fica a entrada?"), e não uma divisão formal do desenho.
export const REGIOES: RegiaoPlanta[] = [
  { key: "tudo", label: "Tudo", x0: 0, y0: 0, x1: 1, y1: 1 },
  { key: "entrada", label: "Entrada", x0: 0.8, y0: 0.0, x1: 1.0, y1: 0.55 },
  { key: "arena-keeta", label: "Arena Keeta", x0: 0.5, y0: 0.25, x1: 0.75, y1: 0.7 },
  { key: "arena-sebrae", label: "Arena Sebrae", x0: 0.12, y0: 0.25, x1: 0.38, y1: 0.7 },
  { key: "expositores", label: "Expositores", x0: 0.6, y0: 0.35, x1: 0.9, y1: 0.95 },
  { key: "gastronomia", label: "Gastronomia", x0: 0.0, y0: 0.55, x1: 0.3, y1: 1.0 },
];

/** Escala em que a planta INTEIRA cabe na viewport (o oposto de "cover"). */
export function computeFitScale(viewport: ViewportSize, content: ContentSize): number {
  if (viewport.width <= 0 || viewport.height <= 0) return 1;
  return Math.min(viewport.width / content.width, viewport.height / content.height);
}

/** Centro e escala que enquadram uma região, respeitando os limites de zoom. */
export function enquadrarRegiao(
  regiao: RegiaoPlanta,
  viewport: ViewportSize,
  content: ContentSize,
  minScale: number,
  maxScale: number
): { center: Point; scale: number } {
  const larguraRegiao = Math.max(1, (regiao.x1 - regiao.x0) * content.width);
  const alturaRegiao = Math.max(1, (regiao.y1 - regiao.y0) * content.height);
  const bruta = Math.min(viewport.width / larguraRegiao, viewport.height / alturaRegiao);
  return {
    center: {
      x: ((regiao.x0 + regiao.x1) / 2) * content.width,
      y: ((regiao.y0 + regiao.y1) / 2) * content.height,
    },
    scale: Math.min(Math.max(bruta, minScale), maxScale),
  };
}

/**
 * Onde cada arena fica na planta de 2026, em coordenadas normalizadas.
 *
 * Chaveado pelo NÚMERO da arena, e não pelo nome inteiro, porque o
 * patrocinador muda e o espaço físico não. Foi o que aconteceu em 2026: a
 * "Arena 2 - Ambev" passou a ser a Arena Sebrae, e com a chave sendo o nome
 * completo bastava renomear no painel para o pino cair no lugar errado —
 * silenciosamente, porque a busca só deixaria de encontrar e o código voltaria
 * às coordenadas do banco (medidas na planta ANTIGA).
 *
 * Por que a posição não vem do banco: `locationMapX/Y` dos eventos foram
 * medidos na planta anterior e não valem mais neste desenho. Quando forem
 * atualizados, basta apagar este mapa e a função abaixo passa a usar o valor
 * do evento sozinha.
 */
const ARENAS_POR_NUMERO: Record<string, Point> = {
  "1": { x: 0.626, y: 0.51 }, // desenhada como ARENA KEETA
  "2": { x: 0.218, y: 0.477 }, // desenhada como ARENA SEBRAE
};

/**
 * O número da arena, quando o local é uma. Exige que o nome COMECE com
 * "Arena" para não capturar o dígito de um estande qualquer ("Estande 3").
 */
export function numeroDaArena(locationName: string): string | null {
  const m = /^\s*arena\s*(\d+)/i.exec(locationName);
  return m ? m[1] : null;
}

/** Posição do evento na planta, em coordenadas normalizadas. */
export function coordenadaDoEvento(event: {
  locationName: string;
  locationMapX?: number | null;
  locationMapY?: number | null;
}): Point | null {
  const numero = numeroDaArena(event.locationName);
  const naPlanta = numero ? ARENAS_POR_NUMERO[numero] : undefined;
  if (naPlanta) return naPlanta;

  if (event.locationMapX == null || event.locationMapY == null) return null;
  return { x: event.locationMapX, y: event.locationMapY };
}
