import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { avisar, confirmar } from "../../lib/dialog";
import { EmptyState, ErrorState, LoadingState } from "../../components/StateView";
import { formatEventDate, formatEventTime } from "../../lib/dateTime";
import { AdminStackParamList } from "../../navigation/types";
import { useEventsStore } from "../events/store";
import { deleteEvent } from "./api";

type Props = NativeStackScreenProps<AdminStackParamList, "AdminEvents">;

export function AdminEventsScreen({ navigation }: Props) {
  const { events, status, error, load, refresh } = useEventsStore();
  const [removendo, setRemovendo] = useState<string | null>(null);

  // Reaproveita o store de eventos que a Agenda já usa — nada de uma segunda
  // cópia da programação só para o painel. Recarrega ao focar para refletir
  // o que acabou de ser criado ou editado.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const confirmarExclusao = (id: string, title: string) => {
    confirmar({
      title: "Excluir palestra",
      message: `"${title}" será removida para todos os participantes, junto com os favoritos e avisos dela. Esta ação não pode ser desfeita.`,
      confirmLabel: "Excluir",
      destructive: true,
      onConfirm: async () => {
        setRemovendo(id);
        try {
          await deleteEvent(id);
          await refresh();
        } catch (err) {
          avisar("Não foi possível excluir", err instanceof Error ? err.message : "Erro desconhecido");
        } finally {
          setRemovendo(null);
        }
      },
    });
  };

  if (status === "loading" && events.length === 0) {
    return <LoadingState label="Carregando palestras..." />;
  }

  if (status === "error" && events.length === 0) {
    return <ErrorState message={error ?? "Erro desconhecido"} onRetry={load} />;
  }

  const ordenados = [...events].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  return (
    <View style={styles.container}>
      <Pressable style={styles.novaButton} onPress={() => navigation.navigate("AdminEventForm", {})}>
        <Text style={styles.novaButtonText}>+ Nova palestra</Text>
      </Pressable>

      <FlatList
        data={ordenados}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={status === "refreshing"} onRefresh={refresh} />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.quando}>
              {formatEventDate(item.startTime)} · {formatEventTime(item.startTime)}–
              {formatEventTime(item.endTime)}
            </Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.local}>{item.locationName}</Text>

            <View style={styles.acoes}>
              <Pressable
                style={styles.acaoSecundaria}
                onPress={() => navigation.navigate("AdminEventForm", { eventId: item.id })}
              >
                <Text style={styles.acaoSecundariaTexto}>Editar</Text>
              </Pressable>
              <Pressable
                style={styles.acaoPerigo}
                onPress={() => confirmarExclusao(item.id, item.title)}
                disabled={removendo === item.id}
              >
                <Text style={styles.acaoPerigoTexto}>
                  {removendo === item.id ? "Excluindo..." : "Excluir"}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={<EmptyState message="Nenhuma palestra cadastrada ainda." />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  novaButton: {
    margin: spacing.md,
    marginBottom: 0,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  novaButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  list: { padding: spacing.md, flexGrow: 1, gap: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  quando: { ...typography.label, color: colors.textMuted },
  title: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: spacing.xs },
  local: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  acoes: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  acaoSecundaria: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  acaoSecundariaTexto: { color: colors.text, fontWeight: "600", fontSize: 13 },
  acaoPerigo: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.live,
  },
  acaoPerigoTexto: { color: colors.live, fontWeight: "600", fontSize: 13 },
});
