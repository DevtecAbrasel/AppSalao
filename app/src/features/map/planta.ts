import { Point } from "./zoomMath";

export type OrientacaoPlanta = "horizontal" | "vertical";

// Os dois arquivos saem do MESMO recorte do PDF vetorial do Salão
// (Mapa-MAP-01), página 1, x=150 y=765 w=3150 h=865 pt, a 2,24x.
// O vertical é exatamente o mesmo desenho girado 90° no sentido horário — não
// há reamostragem nem corte diferente, então a proporção é idêntica e nada
// distorce; o que muda é qual eixo é o longo.
//
// Escolhi o sentido horário (e não o anti-horário) porque a maioria dos nomes
// de estande já vem escrita na vertical na planta original — são baias
// estreitas. Girando neste sentido, esses nomes passam a ser lidos na
// horizontal, que é o oposto do que acontece girando para o outro lado.
export const PLANTAS: Record<
  OrientacaoPlanta,
  { image: number; width: number; height: number }
> = {
  horizontal: {
    image: require("../../../assets/planta-salao-h.png"),
    width: 7056,
    height: 1938,
  },
  vertical: {
    image: require("../../../assets/planta-salao-v.png"),
    width: 1938,
    height: 7056,
  },
};

/**
 * Converte um ponto normalizado (0..1) medido na planta HORIZONTAL para a
 * orientação pedida.
 *
 * Girar 90° no sentido horário leva o pixel (x, y) para (altura − y, x); em
 * coordenadas normalizadas isso vira (1 − y, x). Manter uma única medição e
 * derivar a outra evita o erro clássico de medir duas vezes e as duas versões
 * divergirem com o tempo.
 */
export function paraOrientacao(p: Point, orientacao: OrientacaoPlanta): Point {
  return orientacao === "vertical" ? { x: 1 - p.y, y: p.x } : p;
}

/**
 * Onde cada arena fica na NOVA planta, em coordenadas da versão horizontal.
 *
 * Por que não vem do banco: `locationMapX/Y` dos eventos foram medidos na
 * planta ANTIGA e não valem mais neste desenho. Atualizar o banco de produção
 * está fora do combinado (só código, deploy por `git pull`), então a posição
 * mora aqui junto da planta a que ela se refere. Quando as coordenadas do
 * banco forem atualizadas, basta apagar este mapa: o código volta a usar o
 * valor do evento sozinho.
 *
 * ATENÇÃO: a nova planta não tem "Arena Ambev" — as duas arenas desenhadas são
 * ARENA KEETA e ARENA SEBRAE. O pino da "Arena 2 - Ambev" está sobre a ARENA
 * SEBRAE por ser estruturalmente a segunda arena, mas isso precisa ser
 * confirmado com a organização (pode ser o nome no banco que envelheceu).
 */
export const ARENAS_NA_PLANTA: Record<string, Point> = {
  "Arena 1 - Keeta": { x: 0.626, y: 0.51 },
  "Arena 2 - Ambev": { x: 0.218, y: 0.477 },
};

/** Posição do evento na planta atual, já na orientação pedida. */
export function coordenadaDoEvento(
  event: { locationName: string; locationMapX?: number | null; locationMapY?: number | null },
  orientacao: OrientacaoPlanta
): Point | null {
  const naPlanta = ARENAS_NA_PLANTA[event.locationName];
  if (naPlanta) return paraOrientacao(naPlanta, orientacao);

  if (event.locationMapX == null || event.locationMapY == null) return null;
  return paraOrientacao({ x: event.locationMapX, y: event.locationMapY }, orientacao);
}
