import { StyleSheet, Text, View } from "react-native";
import { colors, radius } from "../../constants/theme";
import { formatCountdown } from "../../lib/dateTime";
import { EventItem } from "../../types";
import { useCountdown } from "./useCountdown";

interface Props {
  event: Pick<EventItem, "startTime" | "endTime">;
}

export function Countdown({ event }: Props) {
  const { status, countdown } = useCountdown(event);

  if (status === "ended") {
    return (
      <View style={[styles.badge, { backgroundColor: colors.ended }]}>
        <Text style={styles.text}>Finalizada</Text>
      </View>
    );
  }

  if (status === "live") {
    return (
      <View style={[styles.badge, { backgroundColor: colors.live }]}>
        <Text style={styles.text}>AO VIVO · termina em {formatCountdown(countdown)}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, { backgroundColor: colors.marinho }]}>
      <Text style={styles.text}>Começa em {formatCountdown(countdown)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
    // Borda sutil garante que a pill tenha contorno visível tanto sobre
    // cards claros quanto sobre o hero em gradiente escuro (EventDetail).
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  text: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
