import { Pressable, StyleSheet, Text } from "react-native";
import { colors, radius, spacing } from "../../constants/theme";
import { confirmar } from "../../lib/dialog";
import { HeaderAction } from "../../navigation/HeaderAction";
import { useAuthStore } from "./store";

interface Props {
  /**
   * "header" = link discreto no cabeçalho (padrão que já existia em Favoritos).
   * "block" = botão de largura cheia, para telas de conta/administração.
   */
  variant?: "header" | "block";
}

// Único ponto de saída da sessão no app. Encerra de verdade — não navega para
// o login: quem chama é `useAuthStore.logout()`, que apaga o token do
// armazenamento seguro e zera os estados. O App.tsx observa `status` e troca
// o navegador inteiro, então a pilha autenticada é desmontada e o "voltar"
// não tem para onde voltar.
export function LogoutButton({ variant = "header" }: Props) {
  const logout = useAuthStore((s) => s.logout);

  const perguntar = () =>
    confirmar({
      title: "Sair da conta",
      message: "Tem certeza que deseja sair?",
      confirmLabel: "Sair",
      destructive: true,
      onConfirm: () => {
        logout();
      },
    });

  if (variant === "block") {
    return (
      <Pressable
        onPress={perguntar}
        style={styles.bloco}
        accessibilityRole="button"
        accessibilityLabel="Sair da conta"
      >
        <Text style={styles.blocoTexto}>Sair da conta</Text>
      </Pressable>
    );
  }

  return (
    <HeaderAction
      icon="logout"
      label="Sair"
      color={colors.primary}
      onPress={perguntar}
      accessibilityLabel="Sair da conta"
    />
  );
}

const styles = StyleSheet.create({
  bloco: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.live,
    alignItems: "center",
  },
  blocoTexto: { color: colors.live, fontWeight: "700", fontSize: 15 },
});
