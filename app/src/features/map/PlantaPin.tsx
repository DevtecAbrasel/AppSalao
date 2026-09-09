import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../constants/theme";

const BASE_SIZE = 28;
const HIGHLIGHTED_SIZE = 34;
const BASE_FONT_SIZE = 12;
const BASE_BORDER_WIDTH = 2;
const HIGHLIGHTED_BORDER_WIDTH = 3;

interface Props {
  x: number; // 0..1, relativo à largura da planta
  y: number; // 0..1, relativo à altura da planta
  /** Cor de fundo do pin — o chamador decide (status do evento, ou uma cor fixa pra pontos de interesse). */
  color: string;
  highlighted: boolean;
  /** Código curto exibido dentro do pin (ex: "1", "2") — já formatado pelo chamador. */
  label: string;
  /**
   * A planta é renderizada na resolução nativa da imagem (bem maior que a
   * tela) e depois escalada pra baixo — então o pin precisa ser "inflado"
   * na mesma proporção pra aparecer do tamanho certo na tela (28px etc).
   * Normalmente `1 / escalaDeEncaixe`.
   */
  sizeMultiplier: number;
  onPress: () => void;
}

export function PlantaPin({ x, y, color, highlighted, label, sizeMultiplier, onPress }: Props) {
  const size = (highlighted ? HIGHLIGHTED_SIZE : BASE_SIZE) * sizeMultiplier;
  const borderWidth = (highlighted ? HIGHLIGHTED_BORDER_WIDTH : BASE_BORDER_WIDTH) * sizeMultiplier;
  const fontSize = BASE_FONT_SIZE * sizeMultiplier;

  return (
    <View
      style={[
        styles.wrapper,
        { left: `${x * 100}%`, top: `${y * 100}%`, marginLeft: -size / 2, marginTop: -size / 2 },
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        onPress={onPress}
        hitSlop={10 * sizeMultiplier}
        style={[
          styles.pin,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth,
            borderColor: highlighted ? colors.secondary : "#fff",
            backgroundColor: color,
          },
        ]}
      >
        <Text style={[styles.pinText, { fontSize }]}>{label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
  },
  pin: {
    alignItems: "center",
    justifyContent: "center",
  },
  pinText: {
    color: "#fff",
    fontWeight: "700",
  },
});
