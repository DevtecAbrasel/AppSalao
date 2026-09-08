import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { avisar, confirmar } from "../../lib/dialog";
import { EmptyState, ErrorState, LoadingState } from "../../components/StateView";
import { formatEventDate } from "../../lib/dateTime";
import { AdminUser, deleteUser, fetchAdminUsers } from "./api";

export function AdminUsersScreen() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [removendo, setRemovendo] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      setUsers(await fetchAdminUsers());
      setStatus("idle");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar usuários");
      setStatus("error");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const confirmarExclusao = (user: AdminUser) => {
    confirmar({
      title: "Excluir usuário",
      message: `A conta ${user.email} será removida junto com seus ${user.favoritesCount} favorito(s) e avisos. Esta ação não pode ser desfeita.`,
      confirmLabel: "Excluir",
      destructive: true,
      onConfirm: async () => {
        setRemovendo(user.id);
        try {
          await deleteUser(user.id);
          await load();
        } catch (err) {
          avisar("Não foi possível excluir", err instanceof Error ? err.message : "Erro desconhecido");
        } finally {
          setRemovendo(null);
        }
      },
    });
  };

  if (status === "loading" && users.length === 0) {
    return <LoadingState label="Carregando usuários..." />;
  }

  if (status === "error" && users.length === 0) {
    return <ErrorState message={error ?? "Erro desconhecido"} onRetry={load} />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={status === "loading"} onRefresh={load} />}
        ListHeaderComponent={
          <Text style={styles.total}>
            {users.length} {users.length === 1 ? "conta cadastrada" : "contas cadastradas"}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cabecalho}>
              <Text style={styles.email} numberOfLines={1}>
                {item.email}
              </Text>
              {item.role === "ADMIN" && (
                <View style={styles.selo}>
                  <Text style={styles.seloTexto}>ADMIN</Text>
                </View>
              )}
            </View>

            <Text style={styles.meta}>
              Desde {formatEventDate(item.createdAt)} · {item.favoritesCount} favorito
              {item.favoritesCount === 1 ? "" : "s"}
            </Text>

            {item.isSelf ? (
              <Text style={styles.voce}>Esta é a sua conta</Text>
            ) : (
              <Pressable
                style={styles.excluir}
                onPress={() => confirmarExclusao(item)}
                disabled={removendo === item.id}
              >
                <Text style={styles.excluirTexto}>
                  {removendo === item.id ? "Excluindo..." : "Excluir conta"}
                </Text>
              </Pressable>
            )}
          </View>
        )}
        ListEmptyComponent={<EmptyState message="Nenhum usuário cadastrado ainda." />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.md, flexGrow: 1, gap: spacing.sm },
  total: { ...typography.label, color: colors.textMuted, marginBottom: spacing.xs },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cabecalho: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  email: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.text },
  selo: {
    backgroundColor: colors.marinho,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  seloTexto: { color: colors.textOnDark, fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: spacing.xs },
  voce: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm, fontStyle: "italic" },
  excluir: {
    marginTop: spacing.sm,
    alignSelf: "flex-start",
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.live,
  },
  excluirTexto: { color: colors.live, fontWeight: "600", fontSize: 13 },
});
