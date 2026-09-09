import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, radius, spacing } from "../../constants/theme";
import { normalizarTexto } from "../../lib/search";
import { EmptyState, ErrorState, LoadingState } from "../../components/StateView";
import { Icon } from "../../components/Icon";
import { AgendaStackParamList } from "../../navigation/types";
import { getEventStatus } from "../../lib/dateTime";
import { EventStatus } from "../../types";
import { useEventsStore } from "./store";
import { useNow } from "./useNow";
import { EventCard } from "./EventCard";
import { FilterChip } from "./FilterChip";

type Props = NativeStackScreenProps<AgendaStackParamList, "AgendaList">;

// Chave estável de "dia" no fuso do evento (Brasília), não no fuso do device.
function dayKeyOf(isoDate: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
    new Date(isoDate)
  );
}

export function AgendaScreen({ navigation }: Props) {
  const { events, status, error, load, refresh } = useEventsStore();
  const [dayFilter, setDayFilter] = useState<string | null>(null);
  // Por padrão a agenda mostra o que ainda vai acontecer; as encerradas ficam
  // atrás do chip "Finalizadas" — somem da lista ativa sem sumir do app.
  const [mostrarFinalizadas, setMostrarFinalizadas] = useState(false);
  const [busca, setBusca] = useState("");

  // Relógio compartilhado da tela: é ele que faz uma palestra migrar para
  // "Finalizada" sozinha, sem o usuário reabrir o app.
  const now = useNow();

  useEffect(() => {
    load();
  }, [load]);

  const days = useMemo(() => {
    const unique = Array.from(new Set(events.map((e) => dayKeyOf(e.startTime))));
    return unique.sort();
  }, [events]);

  // Status calculado uma vez por evento e reaproveitado no filtro e no card.
  const comStatus = useMemo(
    () => events.map((e) => ({ event: e, status: getEventStatus(e, now) as EventStatus })),
    [events, now]
  );

  const finalizadasCount = useMemo(
    () => comStatus.filter((x) => x.status === "ended").length,
    [comStatus]
  );

  // Título e local normalizados uma vez por evento, e não a cada tecla. Só
  // muda quando a lista de eventos muda — nunca toca no dado original.
  const indiceBusca = useMemo(
    () =>
      new Map(
        events.map((e) => [e.id, normalizarTexto(`${e.title} ${e.locationName}`)])
      ),
    [events]
  );

  const termo = useMemo(() => normalizarTexto(busca), [busca]);
  const combina = (id: string) => !termo || (indiceBusca.get(id) ?? "").includes(termo);

  const filteredEvents = useMemo(() => {
    return comStatus
      .filter((x) => (mostrarFinalizadas ? x.status === "ended" : x.status !== "ended"))
      .filter((x) => !dayFilter || dayKeyOf(x.event.startTime) === dayFilter)
      .filter((x) => combina(x.event.id))
      .sort(
        (a, b) =>
          new Date(a.event.startTime).getTime() - new Date(b.event.startTime).getTime()
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comStatus, dayFilter, mostrarFinalizadas, termo, indiceBusca]);

  // Quantas palestras o termo acharia entre as encerradas, para poder avisar
  // quando o resultado vazio é só efeito do filtro de finalizadas.
  const achadasEmFinalizadas = useMemo(() => {
    if (!termo || mostrarFinalizadas) return 0;
    return comStatus.filter((x) => x.status === "ended" && combina(x.event.id)).length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comStatus, termo, mostrarFinalizadas, indiceBusca]);

  if (status === "loading" && events.length === 0) {
    return <LoadingState label="Carregando programação..." />;
  }

  if (status === "error" && events.length === 0) {
    return <ErrorState message={error ?? "Erro desconhecido"} onRetry={load} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.buscaWrapper}>
        <View style={styles.buscaIcone}>
          <Icon name="search" size={18} color={colors.textMuted} />
        </View>
        <TextInput
          style={styles.buscaInput}
          value={busca}
          onChangeText={setBusca}
          placeholder="Pesquisar palestra ou arena..."
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Pesquisar palestra ou arena"
        />
        {busca.length > 0 && (
          <Pressable
            onPress={() => setBusca("")}
            hitSlop={10}
            style={styles.buscaLimpar}
            accessibilityRole="button"
            accessibilityLabel="Limpar pesquisa"
          >
            <Icon name="close" size={16} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {days.length > 1 && (
        <View style={styles.filters}>
          {days.map((day) => (
            <FilterChip
              key={day}
              label={new Intl.DateTimeFormat("pt-BR", {
                timeZone: "America/Sao_Paulo",
                day: "2-digit",
                month: "short",
              }).format(new Date(`${day}T12:00:00-03:00`))}
              active={dayFilter === day}
              onPress={() => setDayFilter(dayFilter === day ? null : day)}
            />
          ))}
        </View>
      )}

      {finalizadasCount > 0 && (
        <View style={styles.filters}>
          <FilterChip
            label={`Finalizadas (${finalizadasCount})`}
            active={mostrarFinalizadas}
            onPress={() => setMostrarFinalizadas((v) => !v)}
          />
        </View>
      )}

      {error && events.length > 0 && (
        <Text style={styles.errorBanner}>Não foi possível atualizar: {error}</Text>
      )}

      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.event.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={status === "refreshing"} onRefresh={refresh} />
        }
        renderItem={({ item }) => (
          <EventCard
            event={item.event}
            status={item.status}
            onPress={() => navigation.navigate("EventDetail", { eventId: item.event.id })}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            message={
              termo
                ? achadasEmFinalizadas > 0
                  ? `Não encontramos nenhuma palestra ou arena com esse nome entre as próximas — mas há ${achadasEmFinalizadas} em "Finalizadas".`
                  : "Não encontramos nenhuma palestra ou arena com esse nome."
                : mostrarFinalizadas
                  ? "Nenhuma palestra finalizada ainda."
                  : "Nenhum evento encontrado para esse filtro."
            }
          />
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
  // Mesma linguagem dos cards: superfície branca, borda suave, cantos retos.
  buscaWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  buscaIcone: {
    // Altura fixa mantém a lupa centrada verticalmente no campo, independente
    // de o SVG ser menor que a linha de texto ao lado.
    alignItems: "center",
    justifyContent: "center",
  },
  buscaInput: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    fontSize: 15,
    color: colors.text,
  },
  buscaLimpar: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -spacing.xs,
  },
  filters: {
    // View simples em vez de ScrollView: só há poucos filtros de data, então
    // não precisa rolar — e evita bugs de medição de altura do ScrollView
    // horizontal no react-native-web.
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  list: {
    padding: spacing.md,
    flexGrow: 1,
  },
  errorBanner: {
    backgroundColor: "#FDECEC",
    color: colors.live,
    fontSize: 12,
    padding: spacing.sm,
    marginHorizontal: spacing.md,
    borderRadius: 8,
  },
});
