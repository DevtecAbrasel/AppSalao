import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { NavigationProp } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients, radius, spacing } from "../../constants/theme";
import { LoadingState, ErrorState } from "../../components/StateView";
import {
  AgendaStackParamList,
  FavoritesStackParamList,
  MapStackParamList,
  RootTabParamList,
} from "../../navigation/types";
import { EventItem } from "../../types";
import { formatEventDate, formatEventTime, getEventStatus } from "../../lib/dateTime";
import { useEventsStore } from "./store";
import { useNow } from "./useNow";
import { useFavoritesStore } from "../favorites/store";
import { fetchEventById } from "./api";
import { Countdown } from "./Countdown";

// EventDetail existe nas stacks de Agenda, Favoritos e Mapa — a tela é a
// mesma, então tipamos com a interseção dos três param lists.
type Props = NativeStackScreenProps<
  AgendaStackParamList & FavoritesStackParamList & MapStackParamList,
  "EventDetail"
>;

export function EventDetailScreen({ route, navigation }: Props) {
  const { eventId } = route.params;
  const cachedEvent = useEventsStore((s) => s.events.find((e) => e.id === eventId));

  const [event, setEvent] = useState<EventItem | undefined>(cachedEvent);
  const [status, setStatus] = useState<"idle" | "loading" | "error">(
    cachedEvent ? "idle" : "loading"
  );
  const [error, setError] = useState<string | null>(null);

  const isFavorite = useFavoritesStore((s) => (event ? s.isFavorite(event.id) : false));
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const now = useNow();

  useEffect(() => {
    if (cachedEvent) return;

    let cancelled = false;
    setStatus("loading");

    fetchEventById(eventId)
      .then((data) => {
        if (!cancelled) {
          setEvent(data);
          setStatus("idle");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Falha ao carregar evento");
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [eventId, cachedEvent]);

  if (status === "loading") {
    return <LoadingState label="Carregando evento..." />;
  }

  if (status === "error" || !event) {
    return <ErrorState message={error ?? "Evento não encontrado"} />;
  }

  const finalizada = getEventStatus(event, now) === "ended";

  const goToMap = () => {
    const rootNavigation = navigation.getParent<NavigationProp<RootTabParamList>>();
    rootNavigation?.navigate("Mapa", {
      screen: "MapView",
      params: { focusEventId: event.id },
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <LinearGradient
        colors={gradients.cinematic}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Countdown event={event} />
        <Text style={styles.title}>{event.title}</Text>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Quando</Text>
          <Text style={styles.infoValue}>
            {formatEventDate(event.startTime)} · {formatEventTime(event.startTime)}–
            {formatEventTime(event.endTime)}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Local</Text>
          <Text style={styles.infoValue}>{event.locationName}</Text>
        </View>

        {event.speaker && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Palestrante</Text>
            <Text style={styles.infoValue}>{event.speaker}</Text>
          </View>
        )}

        <Text style={styles.description}>{event.description}</Text>

        <View style={styles.actions}>
          {/* Encerrada: o botão continua na tela para não deslocar o layout,
              mas fica inerte e explica o porquê, em vez de sumir sem aviso. */}
          <Pressable
            style={[
              styles.button,
              isFavorite && styles.buttonActive,
              finalizada && styles.buttonDisabled,
            ]}
            onPress={() => toggleFavorite(event)}
            disabled={finalizada}
          >
            <Text
              style={[
                styles.buttonText,
                isFavorite && styles.buttonTextActive,
                finalizada && styles.buttonTextDisabled,
              ]}
            >
              {finalizada ? "Palestra finalizada" : isFavorite ? "★ Favoritado" : "☆ Favoritar"}
            </Text>
          </Pressable>

          <Pressable style={styles.buttonOutline} onPress={goToMap}>
            <Text style={styles.buttonOutlineText}>Ver no mapa</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  hero: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.textOnDark,
    marginTop: spacing.sm,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  infoRow: {
    marginTop: spacing.sm,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    color: colors.text,
    marginTop: 2,
  },
  description: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    marginTop: spacing.md,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  button: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  buttonActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  buttonText: {
    fontWeight: "700",
    color: colors.text,
  },
  buttonTextActive: {
    color: "#fff",
  },
  buttonDisabled: {
    backgroundColor: colors.surfaceCream,
    borderColor: colors.border,
  },
  buttonTextDisabled: {
    color: colors.textMuted,
  },
  buttonOutline: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.marinho,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  buttonOutlineText: {
    color: colors.marinho,
    fontWeight: "700",
  },
});
