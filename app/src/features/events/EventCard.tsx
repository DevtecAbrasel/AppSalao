import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { formatEventDate, formatEventTime, getEventStatus } from "../../lib/dateTime";
import { useFavoritesStore } from "../favorites/store";
import { EventItem, EventStatus } from "../../types";
import { Countdown } from "./Countdown";

interface Props {
  event: EventItem;
  onPress: () => void;
  /**
   * Status já calculado pela lista, que precisa dele para filtrar. Sem isto o
   * card abriria um relógio próprio só para descobrir a mesma coisa.
   */
  status?: EventStatus;
}

export function EventCard({ event, onPress, status }: Props) {
  const isFavorite = useFavoritesStore((s) => s.isFavorite(event.id));
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);

  // Sem o status da lista, calcula uma vez na renderização — o card ainda
  // reage ao tempo porque a pill de contagem tem o próprio tique.
  const finalizada = (status ?? getEventStatus(event)) === "ended";

  return (
    <Pressable style={[styles.card, finalizada && styles.cardEnded]} onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.time}>
          {formatEventDate(event.startTime)} · {formatEventTime(event.startTime)}–
          {formatEventTime(event.endTime)}
        </Text>

        {/* Palestra encerrada não pode mais ser favoritada: em vez de um botão
            que parece clicável e não faz nada, a estrela vira um ícone inerte
            (sem Pressable, sem hitSlop) e o motivo aparece no selo abaixo. */}
        {finalizada ? (
          <Text
            style={[styles.star, styles.starDisabled]}
            accessibilityLabel={
              isFavorite
                ? "Palestra finalizada, favoritada anteriormente"
                : "Palestra finalizada, não é mais possível favoritar"
            }
          >
            {isFavorite ? "★" : "☆"}
          </Text>
        ) : (
          <Pressable hitSlop={8} onPress={() => toggleFavorite(event)}>
            <Text style={[styles.star, isFavorite && styles.starActive]}>
              {isFavorite ? "★" : "☆"}
            </Text>
          </Pressable>
        )}
      </View>

      <Text style={[styles.title, finalizada && styles.textEnded]} numberOfLines={2}>
        {event.title}
      </Text>
      <Text style={styles.location}>{event.locationName}</Text>

      <View style={styles.footer}>
        <Countdown event={event} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.none,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  time: {
    color: colors.textMuted,
    fontSize: 13,
  },
  // Finalizada: borda de acento cinza e fundo levemente rebaixado, para não
  // competir visualmente com as palestras que ainda vão acontecer.
  cardEnded: {
    borderLeftColor: colors.ended,
    backgroundColor: colors.surfaceCream,
  },
  textEnded: {
    color: colors.textMuted,
  },
  star: {
    fontSize: 22,
    color: colors.textMuted,
  },
  starActive: {
    color: colors.secondary,
  },
  starDisabled: {
    opacity: 0.35,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginTop: spacing.xs,
  },
  location: {
    ...typography.label,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  footer: {
    marginTop: spacing.sm,
  },
});
