import { StyleSheet, Text, View } from "react-native";
import { colors, radius } from "../../constants/theme";
import { HeaderAction } from "../../navigation/HeaderAction";
import { abrirNaAbaAtual, HeaderNavigation } from "../../navigation/HeaderActions";
import { useNotificationsStore } from "./store";

interface Props {
  /** A navegação da tela — ver a explicação em `HeaderActions`. */
  navigation: HeaderNavigation;
}

// Todos os stacks que exibem o cabeçalho registram a rota "Notifications",
// então o sino abre a lista dentro da aba atual, sem trocá-la.
export function NotificationBell({ navigation }: Props) {
  const unreadCount = useNotificationsStore((s) => s.unreadCount);
  const hasUnread = unreadCount > 0;

  return (
    <HeaderAction
      icon="bell"
      label="Avisos"
      // Sino apagado quando não há nada — o estado "sem novidade" precisa ser
      // visível sem depender só da ausência do contador.
      color={hasUnread ? colors.text : colors.textMuted}
      onPress={() => abrirNaAbaAtual(navigation, "Notifications")}
      accessibilityLabel={
        hasUnread
          ? `Notificações, ${unreadCount} não ${unreadCount === 1 ? "lida" : "lidas"}`
          : "Notificações"
      }
      badge={
        hasUnread ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
          </View>
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -5,
    right: -7,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  badgeText: {
    color: "#fff",
    fontSize: 9.5,
    fontWeight: "700",
    lineHeight: 12,
  },
});
