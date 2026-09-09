import { useEffect, useMemo } from "react";
import { FlatList, RefreshControl, SectionList, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, spacing, typography } from "../../constants/theme";
import { EmptyState, ErrorState, LoadingState } from "../../components/StateView";
import { getEventStatus } from "../../lib/dateTime";
import { EventStatus } from "../../types";
import { FavoritesStackParamList } from "../../navigation/types";
import { EventCard } from "../events/EventCard";
import { useNow } from "../events/useNow";
import { useFavoritesStore } from "./store";

type Props = NativeStackScreenProps<FavoritesStackParamList, "FavoritesList">;

export function FavoritesScreen({ navigation }: Props) {
  const { favorites, status, error, load } = useFavoritesStore();
  const now = useNow();

  useEffect(() => {
    load();
  }, [load]);

  // O favorito NÃO é removido quando a palestra acaba — a linha continua no
  // banco e o usuário continua vendo o que marcou. Ela só deixa de contar como
  // atividade ativa e desce para a seção de encerradas.
  const secoes = useMemo(() => {
    const comStatus = favorites.map((e) => ({
      event: e,
      status: getEventStatus(e, now) as EventStatus,
    }));
    const porHorario = (a: typeof comStatus[number], b: typeof comStatus[number]) =>
      new Date(a.event.startTime).getTime() - new Date(b.event.startTime).getTime();

    const ativos = comStatus.filter((x) => x.status !== "ended").sort(porHorario);
    // Encerradas em ordem inversa: a que acabou por último aparece primeiro.
    const encerrados = comStatus.filter((x) => x.status === "ended").sort((a, b) => -porHorario(a, b));

    return [
      ...(ativos.length ? [{ title: "Próximas", data: ativos }] : []),
      ...(encerrados.length ? [{ title: "Já aconteceram", data: encerrados }] : []),
    ];
  }, [favorites, now]);

  if (status === "loading" && favorites.length === 0) {
    return <LoadingState label="Carregando favoritos..." />;
  }

  if (status === "error" && favorites.length === 0) {
    return <ErrorState message={error ?? "Erro desconhecido"} onRetry={load} />;
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={secoes}
        keyExtractor={(item) => item.event.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        refreshControl={<RefreshControl refreshing={status === "loading"} onRefresh={load} />}
        renderSectionHeader={({ section }) =>
          // Só vale um cabeçalho quando existem as duas seções; com uma só ele
          // seria ruído.
          secoes.length > 1 ? <Text style={styles.secao}>{section.title}</Text> : null
        }
        renderItem={({ item }) => (
          <EventCard
            event={item.event}
            status={item.status}
            onPress={() => navigation.navigate("EventDetail", { eventId: item.event.id })}
          />
        )}
        ListEmptyComponent={
          <EmptyState message="Você ainda não favoritou nenhum evento. Toque na estrela de um evento na Agenda para acompanhá-lo aqui." />
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
  list: {
    padding: spacing.md,
    flexGrow: 1,
  },
  secao: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
});
