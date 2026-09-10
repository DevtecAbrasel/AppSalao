import { View } from "react-native";
import { NotificationBell } from "../features/notifications/NotificationBell";
import { ConsultoriasButton } from "../features/consulting/ConsultoriasButton";
import { InstallAppButton } from "../features/install/InstallAppButton";
import { LogoutButton } from "../features/auth/LogoutButton";
import { spacing } from "../constants/theme";

/**
 * O mínimo que os botões do cabeçalho precisam para navegar.
 *
 * Os parâmetros ficam soltos porque cada stack tipa os próprios nomes de rota
 * como literais, e um `string` genérico não é atribuível a nenhum deles — este
 * componente é usado pelos quatro e não pode se casar com um só.
 */
export interface HeaderNavigation {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigate: (screen: any) => void;
  /**
   * `push` empilha na PILHA ATUAL, por definição.
   *
   * É o que resolve o pulo de aba: `navigate` procura a rota subindo a árvore
   * e, como as quatro abas registram "Consultorias" e "Notifications" com o
   * mesmo nome, ele acabava abrindo na primeira que as declara (Agenda) —
   * mesmo estando registrada na aba atual e mesmo recebendo a navegação da
   * própria tela. Medido: sair de Expositores e cair com "Agenda, back".
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  push?: (screen: any) => void;
}

/** Empilha na aba atual quando dá, e só então recorre ao `navigate`. */
export function abrirNaAbaAtual(navigation: HeaderNavigation, screen: string) {
  if (navigation.push) navigation.push(screen);
  else navigation.navigate(screen);
}

interface Props {
  /**
   * A navegação DA TELA, entregue pelo callback `options` de cada
   * `Stack.Screen`.
   *
   * Sem isso os botões chamavam `useNavigation()` por conta própria — e
   * dentro de `headerRight` esse hook não devolve o stack da aba atual, e sim
   * um navegador acima. O `navigate` então subia até a raiz e abria a tela na
   * PRIMEIRA aba que a registra (Agenda), trocando a aba por baixo de quem
   * tocou e fazendo o "voltar" devolver ao lugar errado.
   */
  navigation: HeaderNavigation;
}

// Ações fixas do cabeçalho, iguais em todas as abas. Antes o "Sair" existia
// só no header de Favoritos: quem estivesse na Agenda ou no Mapa simplesmente
// não tinha como encerrar a sessão sem descobrir que ele morava em outra aba.
//
// As Consultorias entram aqui, e não como aba, porque são UMA tela: uma aba
// inteira para ela empurraria a barra para cinco itens (seis no admin) e
// espremeria os rótulos dos destinos que a pessoa usa o tempo todo.
export function HeaderActions({ navigation }: Props) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
      <ConsultoriasButton navigation={navigation} />
      {/* Não renderiza nada depois de instalado, nem em navegador que não
          oferece instalação — por isso não some espaço em quem não pode usar. */}
      <InstallAppButton />
      <NotificationBell navigation={navigation} />
      <LogoutButton />
    </View>
  );
}
