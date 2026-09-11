import { Image, StyleSheet } from "react-native";

// Proporção do arquivo oficial (LogoCor1.ai, aparado). Fica aqui para que a
// altura venha sempre da largura pedida — assim nenhuma tela precisa saber as
// medidas do arquivo, e trocar o logo por outro só muda este número.
const PROPORCAO = 640 / 286;

interface Props {
  /** Largura em px; a altura acompanha. */
  width?: number;
}

// A assinatura do evento, em creme sobre fundo escuro.
//
// É o mesmo desenho do ícone da tela inicial e da tela de abertura — quem
// instalou o app reconhece no primeiro olhar que chegou no lugar certo.
export function LogoSalao({ width = 168 }: Props) {
  return (
    <Image
      source={require("../../assets/logo-salao.png")}
      style={[styles.logo, { width, height: width / PROPORCAO }]}
      resizeMode="contain"
      accessibilityRole="image"
      accessibilityLabel="Salão Abrasel"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    // O arquivo já vem aparado, então não há margem embutida a compensar.
    alignSelf: "flex-start",
  },
});
