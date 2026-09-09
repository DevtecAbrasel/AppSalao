// Matemática pura do visualizador de pan/zoom — sem estado, sem React, só pra
// poder testar/raciocinar sobre ela isoladamente (e reusar no minimapa).
//
// Convenção: "center" é o ponto do CONTEÚDO (coordenadas nativas do mapa,
// ex: 0..2350 x 0..820) que está exatamente no centro da viewport. Com isso,
// a projeção de qualquer ponto do conteúdo pra tela fica:
//
//   screenX = viewportWidth/2  + scale * (mapX - center.x)
//   screenY = viewportHeight/2 + scale * (mapY - center.y)
//
// Quem transforma isso em `translateX/translateY` é `translationForCenter`
// lá embaixo — e é lá que mora a sutileza do pivô do transform.

export interface Point {
  x: number;
  y: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export interface ContentSize {
  width: number;
  height: number;
}

// Escala mínima que GARANTE que o conteúdo cobre a viewport inteira (estilo
// CSS `object-fit: cover`) — nunca dá pra ver fundo vazio nessa escala ou
// acima dela.
export function computeCoverScale(viewport: ViewportSize, content: ContentSize): number {
  if (viewport.width <= 0 || viewport.height <= 0) return 1;
  return Math.max(viewport.width / content.width, viewport.height / content.height);
}

export function clampScale(scale: number, minScale: number, maxScale: number): number {
  return Math.min(Math.max(scale, minScale), maxScale);
}

// Restringe o centro pra que a área visível nunca ultrapasse os limites do
// conteúdo — é isso que impede o usuário de arrastar o mapa pra fora e expor
// fundo vazio. Numa dimensão em que a viewport (na escala atual) já é maior
// ou igual ao conteúdo inteiro, trava no centro exato dessa dimensão (não há
// pra onde a viewport "andar" sem sobrar espaço).
export function clampCenter(
  center: Point,
  scale: number,
  viewport: ViewportSize,
  content: ContentSize
): Point {
  const halfVisibleW = viewport.width / (2 * scale);
  const halfVisibleH = viewport.height / (2 * scale);

  const x =
    halfVisibleW * 2 >= content.width
      ? content.width / 2
      : Math.min(Math.max(center.x, halfVisibleW), content.width - halfVisibleW);

  const y =
    halfVisibleH * 2 >= content.height
      ? content.height / 2
      : Math.min(Math.max(center.y, halfVisibleH), content.height - halfVisibleH);

  return { x, y };
}

// `translateX/translateY` que faz a projeção lá de cima valer de verdade.
//
// ATENÇÃO ao pivô: a View transformada tem exatamente o tamanho da viewport,
// e tanto o React Native quanto o CSS pivotam transforms no CENTRO da própria
// View — não no canto superior esquerdo. Ou seja, o que é realmente pintado é
//
//   screen = O + T + scale * (p - O),  com O = (viewportWidth/2, viewportHeight/2)
//
// Igualando isso à projeção desejada sobra `T = scale * (O - center)`. Usar
// `T = O - scale * center` (a fórmula do pivô no canto, que é o que estava
// aqui antes) desloca tudo em `(O)(1 - scale)`: no zoom mínimo isso é o que
// abria faixa vazia numa borda e tornava o outro lado do mapa inalcançável,
// porque o clamp trava o MODELO, e o modelo não batia com o que era pintado.
export function translationForCenter(
  center: Point,
  scale: number,
  viewport: ViewportSize
): Point {
  return {
    x: scale * (viewport.width / 2 - center.x),
    y: scale * (viewport.height / 2 - center.y),
  };
}

// Ponto do conteúdo que está, agora, sob a coordenada de tela (screenX,
// screenY) — inverso da fórmula de projeção lá em cima.
export function mapPointAtScreen(
  screenPoint: Point,
  viewport: ViewportSize,
  scale: number,
  center: Point
): Point {
  return {
    x: center.x + (screenPoint.x - viewport.width / 2) / scale,
    y: center.y + (screenPoint.y - viewport.height / 2) / scale,
  };
}

// Dado que `mapPoint` deve continuar exatamente sob `screenPoint` depois de
// mudar pra `newScale`, resolve qual `center` faz isso valer — é o "zoom
// ancorado num ponto" (dedo do pinça, cursor do mouse).
export function centerForFixedPoint(
  mapPoint: Point,
  screenPoint: Point,
  viewport: ViewportSize,
  newScale: number
): Point {
  return {
    x: mapPoint.x - (screenPoint.x - viewport.width / 2) / newScale,
    y: mapPoint.y - (screenPoint.y - viewport.height / 2) / newScale,
  };
}

// O retângulo do conteúdo (coordenadas nativas) atualmente visível na
// viewport — usado pelo minimapa pra desenhar o retângulo de destaque.
export function visibleContentRect(viewport: ViewportSize, scale: number, center: Point) {
  const halfW = viewport.width / (2 * scale);
  const halfH = viewport.height / (2 * scale);
  return {
    x: center.x - halfW,
    y: center.y - halfH,
    width: halfW * 2,
    height: halfH * 2,
  };
}
