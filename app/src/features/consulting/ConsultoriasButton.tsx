import { HeaderAction } from "../../navigation/HeaderAction";
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
    <HeaderAction
      icon="chat"
      label="Consultoria"
      onPress={() => abrirNaAbaAtual(navigation, "Consultorias")}
      accessibilityLabel="Consultorias com especialistas"
    />
  );
}
