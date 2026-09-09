import { useCallback, useEffect } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { EmptyState, ErrorState, LoadingState } from "../../components/StateView";
import { Icon } from "../../components/Icon";
import { formatEventDate, formatEventTime } from "../../lib/dateTime";
import { NotificationItem } from "./api";
import { useNotificationsStore } from "./store";

// Aceita qualquer um dos três stacks — todos declaram estas duas rotas.
type Props = NativeStackScreenProps<
  { Notifications: undefined; EventDetail: { eventId: string } },
  "Notifications"
>;

function formatWhen(iso: string): string {
  return `${formatEventDate(iso)} · ${formatEventTime(iso)}`;
}

export function NotificationsScreen({ navigation }: Props) {
  const { items, unreadCount, status, error, load, markAsRead, markAllAsRead } =
    useNotificationsStore();

  useEffect(() => {
    load();
  }, [load]);

  // Além do polling de 1 minuto, revalida sempre que a tela ganha foco — é o
  // momento em que o usuário mais espera ver a lista em dia.
  useFocusEffect(
    useCallback(() => {
      load({ silent: true });
    }, [load])
  );

  const handlePress = (item: NotificationItem) => {
    markAsRead(item.id);
    if (item.event) {
      navigation.navigate("EventDetail", { eventId: item.event.id });
    }
  };

  if (status === "loading" && items.length === 0) {
    return <LoadingState label="Carregando notificações..." />;
  }

  if (status === "error" && items.length === 0) {
    return <ErrorState message={error ?? "Erro desconhecido"} onRetry={load} />;
  }

  return (
    <View style={styles.container}>
      {unreadCount > 0 && (
        <View style={styles.toolbar}>
          <Text style={styles.toolbarCount}>
            {unreadCount} não {unreadCount === 1 ? "lida" : "lidas"}
          </Text>
          <Pressable onPress={() => markAllAsRead()} hitSlop={8}>
            <Text style={styles.toolbarAction}>Marcar todas como lidas</Text>
          </Pressable>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={status === "loading"} onRefresh={() => load()} />
        }
        renderItem={({ item }) => {
          const isUnread = item.readAt === null;

          return (
            <Pressable
              style={[styles.card, isUnread && styles.cardUnread]}
              onPress={() => handlePress(item)}
              accessibilityRole="button"
              accessibilityLabel={`${isUnread ? "Não lida. " : ""}${item.title}. ${item.message}`}
            >
              <View style={styles.cardHeader}>
                {isUnread && <View style={styles.unreadDot} />}
                <Text style={[styles.title, isUnread && styles.titleUnread]} numberOfLines={2}>
                  {item.title}
                </Text>
              </View>

              <Text style={styles.message}>{item.message}</Text>

              <View style={styles.footer}>
                <Text style={styles.timestamp}>{formatWhen(item.createdAt)}</Text>
                {item.event && (
                  <View style={styles.linkWrapper}>
                    <Text style={styles.link}>Ver palestra</Text>
                    <Icon name="chevron-right" size={16} color={colors.primary} />
                  </View>
                )}
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <EmptyState message="Nenhuma notificação por aqui. Favorite uma palestra na Agenda e avisamos você quando o horário estiver chegando." />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toolbarCount: {
    ...typography.label,
    color: colors.textMuted,
  },
  toolbarAction: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 13,
  },
  list: {
    padding: spacing.md,
    flexGrow: 1,
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  // Não lida: borda de acento à esquerda, mesmo recurso que o EventCard usa
  // pra sinalizar status sem inventar outra linguagem visual.
  cardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  titleUnread: {
    fontWeight: "700",
  },
  message: {
    marginTop: spacing.xs,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
  },
  footer: {
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timestamp: {
    fontSize: 12,
    color: colors.textMuted,
  },
  // A seta encosta no texto (margem negativa compensa o respiro interno do
  // traçado de 24×24) para o par ler como um único link.
  linkWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: -4,
  },
  link: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
});
