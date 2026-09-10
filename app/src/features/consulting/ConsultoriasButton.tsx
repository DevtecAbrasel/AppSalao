import { Pressable, StyleSheet } from "react-native";
import { colors, spacing } from "../../constants/theme";
import { Icon } from "../../components/Icon";
import { abrirNaAbaAtual, HeaderNavigation } from "../../navigation/HeaderActions";

interface Props {
  /** A navegação da tela — ver a explicação em `HeaderActions`. */
  navigation: HeaderNavigation;
}

// Todos os stacks que exibem o cabeçalho registram a rota "Consultorias",
// então a tela empilha DENTRO da aba em que a pessoa já está e o "voltar"
// devolve ao lugar de origem.
export function ConsultoriasButton({ navigation }: Props) {
  return (
    <Pressable
      onPress={() => abrirNaAbaAtual(navigation, "Consultorias")}
      hitSlop={8}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel="Consultorias com especialistas"
    >
      <Icon name="chat" size={21} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: spacing.xs,
    alignItems: "center",
    justifyContent: "center",
  },
});
