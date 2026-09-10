import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../constants/theme";
import { Icon } from "../../components/Icon";
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
    <Pressable
      onPress={() => abrirNaAbaAtual(navigation, "Notifications")}
      hitSlop={8}
      style={styles.button}
      accessibilityRole="button"
      accessibilityLabel={
        hasUnread
          ? `Notificações, ${unreadCount} não ${unreadCount === 1 ? "lida" : "lidas"}`
          : "Notificações"
      }
    >
      {/* Sino apagado quando não há nada — o estado "sem novidade" precisa
          ser visível sem depender só da ausência do badge. */}
      <Icon name="bell" size={22} color={hasUnread ? colors.text : colors.textMuted} />
      {hasUnread && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: spacing.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -2,
    minWidth: 17,
    height: 17,
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
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 13,
  },
});
