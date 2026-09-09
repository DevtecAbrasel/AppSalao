import { useEffect, useRef, useState } from "react";
import { Animated, GestureResponderEvent, Image, Pressable, StyleSheet, View } from "react-native";
import { colors, radius } from "../../constants/theme";
import { Icon } from "../../components/Icon";
import { Point, visibleContentRect } from "./zoomMath";

const MINIMAP_WIDTH = 108;
// Quanto o retângulo de destaque pode passar da borda do minimapa enquanto a
// mola assenta — fração do tamanho do próprio retângulo. É SÓ ENFEITE: o mapa
// principal continua travado por `clampCenter` (zoomMath.ts) e nunca expõe
// fundo vazio por causa disso.
const OVERSHOOT_RATIO = 0.08;

interface Props {
  imageSource: number;
  contentWidth: number;
  contentHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  scale: number;
  center: Point;
  onRecenter: (x: number, y: number) => void;
}

// Visão geral da planta inteira, num canto (sobreposta ao mapa, sem ocupar
// espaço de layout) — mostra um retângulo com a área que está sendo vista no
// mapa principal, atualizado a cada pan/zoom. Tocar nele recentraliza o mapa
// principal ali (mantendo a escala atual).
export function Minimap({
  imageSource,
  contentWidth,
  contentHeight,
  viewportWidth,
  viewportHeight,
  scale,
  center,
  onRecenter,
}: Props) {
  const [expanded, setExpanded] = useState(true);

  const minimapHeight = MINIMAP_WIDTH * (contentHeight / contentWidth);
  const minimapScale = MINIMAP_WIDTH / contentWidth;

  // Área visível do mapa principal em COORDENADAS INTRÍNSECAS da planta —
  // exatamente a mesma fonte da verdade (escala + centro) que o ZoomPan usa
  // pra montar o transform. Travamos nos limites reais do mapa antes de
  // converter pro minimapa (defesa contra arredondamento; o mapa em si já é
  // travado por `clampCenter`).
  const rect = visibleContentRect({ width: viewportWidth, height: viewportHeight }, scale, center);
  const x0 = clamp(rect.x, 0, contentWidth);
  const y0 = clamp(rect.y, 0, contentHeight);
  const x1 = clamp(rect.x + rect.width, x0, contentWidth);
  const y1 = clamp(rect.y + rect.height, y0, contentHeight);

  // ...e daí, proporcionalmente, pras coordenadas do minimapa.
  const rectLeft = x0 * minimapScale;
  const rectTop = y0 * minimapScale;
  const rectWidth = (x1 - x0) * minimapScale;
  const rectHeight = (y1 - y0) * minimapScale;

  // Anima o retângulo até a posição/tamanho de verdade (calculados acima, já
  // dentro dos limites reais do mapa) com uma leve "mola" — isso é só visual
  // (dá a sensação de menos rigidez ao chegar numa borda); os limites do
  // mapa em si (`clampCenter`, em zoomMath.ts) continuam rígidos, nunca
  // relaxados por causa disso.
  const animLeft = useRef(new Animated.Value(rectLeft)).current;
  const animTop = useRef(new Animated.Value(rectTop)).current;
  const animWidth = useRef(new Animated.Value(rectWidth)).current;
  const animHeight = useRef(new Animated.Value(rectHeight)).current;

  useEffect(() => {
    const springConfig = { friction: 6, tension: 80, useNativeDriver: false };
    Animated.parallel([
      Animated.spring(animLeft, { toValue: rectLeft, ...springConfig }),
      Animated.spring(animTop, { toValue: rectTop, ...springConfig }),
      Animated.spring(animWidth, { toValue: rectWidth, ...springConfig }),
      Animated.spring(animHeight, { toValue: rectHeight, ...springConfig }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rectLeft, rectTop, rectWidth, rectHeight]);

  // A mola acima passa um pouco do alvo antes de assentar. Deixamos esse
  // excesso APARECER (o recorte arredondado ficou só na imagem, abaixo), mas
  // limitado a OVERSHOOT_RATIO do tamanho do retângulo — daí o interpolate
  // identidade com `extrapolate: "clamp"`. Nada disso volta pro mapa: o alvo
  // da mola (rectLeft/rectTop) é sempre o valor lógico já travado.
  const overshootX = rectWidth * OVERSHOOT_RATIO;
  const overshootY = rectHeight * OVERSHOOT_RATIO;
  const left = clampedRange(animLeft, -overshootX, MINIMAP_WIDTH - rectWidth + overshootX);
  const top = clampedRange(animTop, -overshootY, minimapHeight - rectHeight + overshootY);

  const handlePress = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    onRecenter(locationX / minimapScale, locationY / minimapScale);
  };

  if (!expanded) {
    return (
      <Pressable
        onPress={() => setExpanded(true)}
        style={styles.restoreButton}
        hitSlop={8}
        accessibilityLabel="Mostrar minimapa"
      >
        <Icon name="map" size={16} color={colors.marinho} />
      </Pressable>
    );
  }

  return (
    <View style={[styles.container, { width: MINIMAP_WIDTH, height: minimapHeight }]}>
      <Pressable onPress={handlePress} style={StyleSheet.absoluteFill}>
        <View style={styles.imageClip}>
          <Image source={imageSource} style={styles.image} resizeMode="cover" />
        </View>
        <Animated.View
          style={[
            styles.viewportRect,
            { left, top, width: animWidth, height: animHeight },
          ]}
        />
      </Pressable>
      <Pressable
        onPress={() => setExpanded(false)}
        style={styles.collapseButton}
        hitSlop={8}
        accessibilityLabel="Esconder minimapa"
      >
        <Icon name="close" size={11} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

function clamp(value: number, min: number, max: number): number {
  // Um NaN escapando daqui contamina o retângulo inteiro e derruba o
  // `interpolate` abaixo (que lança Invariant Violation) — melhor degradar
  // pro limite inferior do que quebrar a tela do mapa.
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), Math.max(min, max));
}

// Interpolação identidade que só serve pra travar o valor animado num
// intervalo (o `Animated` não tem um "clamp" direto pra isso).
function clampedRange(value: Animated.Value, min: number, max: number) {
  const safeMin = Number.isFinite(min) ? min : 0;
  const safeMax = Math.max(Number.isFinite(max) ? max : safeMin, safeMin + 0.001);
  return value.interpolate({
    inputRange: [safeMin, safeMax],
    outputRange: [safeMin, safeMax],
    extrapolate: "clamp",
  });
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    opacity: 0.9,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  // O recorte arredondado ficou aqui (e não no container) pra que o retângulo
  // de destaque possa passar levemente da borda sem ser cortado.
  imageClip: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    opacity: 0.6,
  },
  viewportRect: {
    position: "absolute",
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}33`,
  },
  collapseButton: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  restoreButton: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    opacity: 0.9,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
});
