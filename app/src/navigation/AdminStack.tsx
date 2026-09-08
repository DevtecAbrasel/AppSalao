import { Pressable, StyleSheet, Text, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AdminEventsScreen } from "../features/admin/AdminEventsScreen";
import { AdminEventFormScreen } from "../features/admin/AdminEventFormScreen";
import { AdminUsersScreen } from "../features/admin/AdminUsersScreen";
import { useAuthStore } from "../features/auth/store";
import { LogoutButton } from "../features/auth/LogoutButton";
import { colors, radius, spacing, typography } from "../constants/theme";
import { AdminStackParamList } from "./types";

const Stack = createNativeStackNavigator<AdminStackParamList>();

type HomeProps = NativeStackScreenProps<AdminStackParamList, "AdminHome">;

function AdminHomeScreen({ navigation }: HomeProps) {
  const user = useAuthStore((s) => s.user);

  return (
    <View style={styles.home}>
      <Text style={styles.conta}>Conectado como {user?.email}</Text>

      <Pressable style={styles.cartao} onPress={() => navigation.navigate("AdminEvents")}>
        <Text style={styles.cartaoTitulo}>Palestras</Text>
        <Text style={styles.cartaoTexto}>
          Criar, editar e excluir palestras da programação. As alterações valem na hora para todos.
        </Text>
      </Pressable>

      <Pressable style={styles.cartao} onPress={() => navigation.navigate("AdminUsers")}>
        <Text style={styles.cartaoTitulo}>Usuários</Text>
        <Text style={styles.cartaoTexto}>
          Ver as contas cadastradas e remover uma quando necessário.
        </Text>
      </Pressable>

      {/* O hub é a área de conta do admin, então é aqui que a saída fica
          visível — sem depender de lembrar que o "Sair" mora em Favoritos. */}
      <LogoutButton variant="block" />
    </View>
  );
}

export function AdminStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen name="AdminHome" component={AdminHomeScreen} options={{ title: "Administração" }} />
      <Stack.Screen name="AdminEvents" component={AdminEventsScreen} options={{ title: "Palestras" }} />
      <Stack.Screen
        name="AdminEventForm"
        component={AdminEventFormScreen}
        options={({ route }) => ({ title: route.params?.eventId ? "Editar palestra" : "Nova palestra" })}
      />
      <Stack.Screen name="AdminUsers" component={AdminUsersScreen} options={{ title: "Usuários" }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  home: { flex: 1, backgroundColor: colors.background, padding: spacing.md, gap: spacing.sm },
  conta: { ...typography.label, color: colors.textMuted, marginBottom: spacing.xs },
  cartao: {
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cartaoTitulo: { fontSize: 16, fontWeight: "700", color: colors.text },
  cartaoTexto: { fontSize: 13, color: colors.textMuted, marginTop: spacing.xs, lineHeight: 18 },
});
