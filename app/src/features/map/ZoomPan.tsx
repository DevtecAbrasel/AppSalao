import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Animated, Platform, StyleSheet, View } from "react-native";
import { PanGestureHandler, PinchGestureHandler, State } from "react-native-gesture-handler";
import {
  centerForFixedPoint,
  clampCenter,
  clampPointToContent,
  clampScale,
  mapPointAtScreen,
  Point,
  translationForCenter,
} from "./zoomMath";

interface Props {
  children: React.ReactNode;
  viewportWidth: number;
  viewportHeight: number;
  contentWidth: number;
  contentHeight: number;
  /** Escala mínima (normalmente a escala "cover" — conteúdo cobre a viewport
   * inteira, nunca menos que isso). */
  minScale: number;
  maxScale: number;
  /** Chamado sempre que escala/centro mudam — o MapScreen usa isso pra
   * manter o minimapa em sincronia com o que está sendo visto. */
  onViewportChange?: (state: { scale: number; center: Point }) => void;
}

export interface ZoomPanHandle {
  /** Centraliza (com transição suave) o ponto (coordenadas nativas do
   * conteúdo) na viewport, na escala dada — sempre respeitando os limites. */
  centerOn: (x: number, y: number, targetScale: number) => void;
  /** Aumenta/diminui o zoom em torno do centro da viewport (usado pelos
   * botões +/-). */
  zoomIn: () => void;
  zoomOut: () => void;
}

const ZOOM_STEP = 1.5;
const ANIMATION_MS = 260;

// Visualizador de pan/zoom com limites rígidos: o conteúdo nunca pode ser
// visto em escala menor que "cover" (cobre a viewport inteira) e o usuário
// nunca consegue arrastar a área visível pra fora do conteúdo — ambas as
// coisas são garantidas centralizando toda a matemática em `zoomMath.ts` e
// sempre passando por `clampScale`/`clampCenter` antes de aplicar qualquer
// mudança (gesto, botão, ou o `centerOn` inicial).
//
// Estado "de verdade" fica em refs simples (scale + o ponto do conteúdo que
// está no centro da tela) — os `Animated.Value` são só a projeção desse
// estado pra estilo, atualizados via `.setValue()`. Isso permite recalcular
// e travar os limites a cada frame de gesto (em JS), o que não dá pra fazer
// com a composição base+delta via `Animated.add`/`multiply` + native driver
// usada antes (o driver nativo não deixa o JS interceptar/clampar por
// frame).
export const ZoomPan = forwardRef<ZoomPanHandle, Props>(function ZoomPan(
  {
    children,
    viewportWidth,
    viewportHeight,
    contentWidth,
    contentHeight,
    minScale,
    maxScale,
    onViewportChange,
  },
  ref
) {
  const scaleAnim = useRef(new Animated.Value(minScale)).current;
  const translateXAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;

  const scaleRef = useRef(minScale);
  const centerRef = useRef<Point>({ x: contentWidth / 2, y: contentHeight / 2 });

  const panStartCenterRef = useRef<Point>({ x: 0, y: 0 });
  // `null` = ainda não vimos nenhum evento desta pinça; o primeiro evento
  // define a base (assim o primeiro incremento é exatamente 1, sem pulinho).
  const pinchLastScaleRef = useRef<number | null>(null);
  // Canto superior esquerdo da viewport em coordenadas de página — só usado
  // na web (ver `toViewportPoint`). Em nativo fica em (0,0) e não interfere.
  const pinchOriginRef = useRef<Point>({ x: 0, y: 0 });

  const pinchRef = useRef(null);
  const panRef = useRef(null);
  const containerRef = useRef<View>(null);

  const viewport = { width: viewportWidth, height: viewportHeight };
  const content = { width: contentWidth, height: contentHeight };

  // Recebe o centro pretendido (ainda SEM limites) e é aqui que os limites
  // são aplicados — assim todo caminho que mexe no mapa (gesto, botão,
  // atalho) passa pela mesma porta e não há como esquecer de travar num
  // deles. Depois projeta pra translateX/Y (via `translationForCenter`, que
  // já leva em conta que o pivô do transform é o centro da View) e avisa quem
  // está ouvindo (minimapa).
  const commit = (scale: number, desired: Point, animated: boolean) => {
    const center = clampCenter(desired, scale, viewport, content);

    scaleRef.current = scale;
    centerRef.current = center;

    const { x: offsetX, y: offsetY } = translationForCenter(center, scale, viewport);

    if (animated) {
      Animated.parallel([
        Animated.timing(scaleAnim, { toValue: scale, duration: ANIMATION_MS, useNativeDriver: true }),
        Animated.timing(translateXAnim, { toValue: offsetX, duration: ANIMATION_MS, useNativeDriver: true }),
        Animated.timing(translateYAnim, { toValue: offsetY, duration: ANIMATION_MS, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(scale);
      translateXAnim.setValue(offsetX);
      translateYAnim.setValue(offsetY);
    }

    onViewportChange?.({ scale, center });
  };

  const applyTransform = (x: number, y: number, targetScale: number, animated: boolean) => {
    const scale = clampScale(targetScale, minScale, maxScale);
    commit(scale, { x, y }, animated);
  };

  // Se a viewport muda de tamanho (rotação, resize da janela) ou os limites
  // de escala mudam (a "cover" depende da viewport), reaplica os limites
  // mantendo o mesmo ponto do mapa centralizado sempre que possível.
  useEffect(() => {
    applyTransform(centerRef.current.x, centerRef.current.y, scaleRef.current, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewportWidth, viewportHeight, contentWidth, contentHeight, minScale, maxScale]);

  useImperativeHandle(ref, () => ({
    centerOn: (x, y, targetScale) => applyTransform(x, y, targetScale, true),
    zoomIn: () => {
      const center = { x: viewportWidth / 2, y: viewportHeight / 2 };
      const mapPoint = mapPointAtScreen(center, viewport, scaleRef.current, centerRef.current);
      const newScale = clampScale(scaleRef.current * ZOOM_STEP, minScale, maxScale);
      const newCenter = centerForFixedPoint(mapPoint, center, viewport, newScale);
      applyTransform(newCenter.x, newCenter.y, newScale, true);
    },
    zoomOut: () => {
      const center = { x: viewportWidth / 2, y: viewportHeight / 2 };
      const mapPoint = mapPointAtScreen(center, viewport, scaleRef.current, centerRef.current);
      const newScale = clampScale(scaleRef.current / ZOOM_STEP, minScale, maxScale);
      const newCenter = centerForFixedPoint(mapPoint, center, viewport, newScale);
      applyTransform(newCenter.x, newCenter.y, newScale, true);
    },
  }));

  // --- Pan (arrastar com 1 dedo / mouse) ---------------------------------
  // Repara a referência de início do gesto quando ele entra em ACTIVE vindo
  // de um estado não-ativo — mais confiável do que depender só de BEGAN
  // (que em alguns casos, sobretudo na web, pode não disparar isoladamente
  // antes do primeiro evento de movimento, deixando a referência desatualizada
  // e causando "pulos" ao trocar de 1 pra 2 dedos e vice-versa).
  const onPanStateChange = (event: { nativeEvent: { state: number; oldState: number } }) => {
    const { state, oldState } = event.nativeEvent;
    if (state === State.ACTIVE && oldState !== State.ACTIVE) {
      // Parte do que está PINTADO: é sobre essa imagem que o dedo desliza.
      panStartCenterRef.current = { ...centerRef.current };
    }
  };

  const onPanGestureEvent = (event: {
    nativeEvent: { translationX: number; translationY: number };
  }) => {
    const { translationX, translationY } = event.nativeEvent;
    const scale = scaleRef.current;
    const proposed: Point = {
      x: panStartCenterRef.current.x - translationX / scale,
      y: panStartCenterRef.current.y - translationY / scale,
    };
    commit(scale, proposed, false);
  };

  // --- Pinça (zoom com 2 dedos, ancorado no ponto médio dos dedos) -------
  // O `focalX/focalY` do gesture-handler NÃO vem em coordenadas da viewport:
  //  - na web ele é absoluto (clientX/clientY da página);
  //  - em nativo ele é relativo à View do próprio handler.
  // Por isso a View que o PinchGestureHandler embrulha (lá no render) é uma
  // View do tamanho exato da viewport e SEM transform — assim o caso nativo
  // já chega certo — e na web descontamos aqui a posição da viewport na
  // página. Sem essa conversão o ponto âncora caía fora do mapa, o
  // `clampCenter` corrigia pro limite mais próximo e a pinça parecia
  // simplesmente não funcionar (ou dar saltos).
  const toViewportPoint = (focalX: number, focalY: number): Point => ({
    x: focalX - pinchOriginRef.current.x,
    y: focalY - pinchOriginRef.current.y,
  });

  const refreshPinchOrigin = () => {
    if (Platform.OS !== "web") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = containerRef.current as unknown as HTMLElement | null;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    pinchOriginRef.current = { x: rect.left, y: rect.top };
  };

  const onPinchStateChange = (event: { nativeEvent: { state: number; oldState: number } }) => {
    const { state, oldState } = event.nativeEvent;
    // Mede a viewport uma vez por gesto (no BEGAN), pra não forçar reflow a
    // cada frame de pinça.
    if (state === State.BEGAN || (state === State.ACTIVE && oldState !== State.ACTIVE)) {
      refreshPinchOrigin();
    }
    if (state === State.ACTIVE && oldState !== State.ACTIVE) {
      pinchLastScaleRef.current = null;
    }
  };

  const onPinchGestureEvent = (event: {
    nativeEvent: { scale: number; focalX: number; focalY: number };
  }) => {
    const { scale: cumulativeScale, focalX, focalY } = event.nativeEvent;
    // Rede de segurança caso o primeiro evento do gesto chegue antes do
    // `onHandlerStateChange` — sem isso o primeiro frame usaria uma origem
    // velha na web.
    if (pinchLastScaleRef.current === null) refreshPinchOrigin();
    const focal = toViewportPoint(focalX, focalY);

    // Fator incremental desde o último evento (o `scale` do gesture-handler
    // é cumulativo desde o início do gesto, não incremental).
    const incremental = cumulativeScale / (pinchLastScaleRef.current ?? cumulativeScale);
    pinchLastScaleRef.current = cumulativeScale;
    if (!Number.isFinite(incremental) || incremental <= 0) return;

    const mapPointUnderFinger = clampPointToContent(
      mapPointAtScreen(focal, viewport, scaleRef.current, centerRef.current),
      content
    );
    const newScale = clampScale(scaleRef.current * incremental, minScale, maxScale);
    const newCenterRaw = centerForFixedPoint(mapPointUnderFinger, focal, viewport, newScale);

    commit(newScale, newCenterRaw, false);
  };

  // --- Wheel do mouse (desktop), ancorado no cursor ----------------------
  useEffect(() => {
    if (Platform.OS !== "web") return;
    // RNW encaminha a ref de View pro nó DOM real por baixo.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const node = containerRef.current as unknown as HTMLElement | null;
    if (!node) return;

    // Sem isso, o PRÓPRIO NAVEGADOR intercepta o gesto de pinça (zoom da
    // página) e o pull-to-refresh/overscroll perto das bordas — o
    // PinchGestureHandler nunca chega a receber o toque, e o pan parece
    // "travar antes da hora" perto das bordas. Escopado só a este elemento,
    // então o resto da página continua rolando/dando zoom normalmente.
    const previousTouchAction = node.style.touchAction;
    node.style.touchAction = "none";

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();

      const rect = node.getBoundingClientRect();
      const cursor = { x: event.clientX - rect.left, y: event.clientY - rect.top };

      const factor = Math.exp(-event.deltaY * 0.0015);
      const newScale = clampScale(scaleRef.current * factor, minScale, maxScale);

      const mapPointUnderCursor = clampPointToContent(
        mapPointAtScreen(cursor, viewport, scaleRef.current, centerRef.current),
        content
      );
      const newCenterRaw = centerForFixedPoint(mapPointUnderCursor, cursor, viewport, newScale);

      commit(newScale, newCenterRaw, false);
    };

    node.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      node.removeEventListener("wheel", handleWheel);
      node.style.touchAction = previousTouchAction;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewportWidth, viewportHeight, contentWidth, contentHeight, minScale, maxScale]);

  return (
    <View ref={containerRef} style={styles.flex}>
      <PanGestureHandler
        ref={panRef}
        simultaneousHandlers={pinchRef}
        onGestureEvent={onPanGestureEvent}
        onHandlerStateChange={onPanStateChange}
        minPointers={1}
        // Divisão de trabalho: 1 dedo = pan, 2 dedos = pinça. Quando o
        // segundo dedo encosta, o gesture-handler rebaseia a translação antes
        // de cancelar este handler, então trocar 1 <-> 2 dedos não dá salto —
        // e ao voltar pra 1 dedo o `onPanStateChange` recalibra a referência.
        maxPointers={1}
      >
        <Animated.View style={styles.flex}>
          <PinchGestureHandler
            ref={pinchRef}
            simultaneousHandlers={panRef}
            onGestureEvent={onPinchGestureEvent}
            onHandlerStateChange={onPinchStateChange}
          >
            {/* Esta View (a View DO handler) precisa ter exatamente o tamanho
                da viewport e ficar SEM transform: é em relação a ela que o
                gesture-handler reporta `focalX/focalY` em nativo. O transform
                mora na View de dentro. */}
            <Animated.View style={styles.flex}>
              <Animated.View
                style={[
                  styles.flex,
                  {
                    transform: [
                      { translateX: translateXAnim },
                      { translateY: translateYAnim },
                      { scale: scaleAnim },
                    ],
                  },
                ]}
              >
                {children}
              </Animated.View>
            </Animated.View>
          </PinchGestureHandler>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
});

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
