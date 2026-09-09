import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Platform } from "react-native";
import { colors, spacing } from "../constants/theme";
import { Icon, IconName } from "../components/Icon";
import { AgendaStackNavigator } from "./AgendaStack";
import { FavoritesStackNavigator } from "./FavoritesStack";
import { MapStackNavigator } from "./MapStack";
import { AdminStackNavigator } from "./AdminStack";
import { useAuthStore } from "../features/auth/store";
import { RootTabParamList } from "./types";

const Tab = createBottomTabNavigator<RootTabParamList>();

const ICONS: Record<keyof RootTabParamList, IconName> = {
  Agenda: "calendar",
  Favoritos: "star",
  Mapa: "map",
  Admin: "settings",
};

export function RootTabs() {
  // A aba só aparece para administradores, mas isso é conveniência de
  // interface: quem proíbe de fato é o servidor (requireAdmin), então montar
  // a requisição na mão não adianta.
  const isAdmin = useAuthStore((s) => s.user?.role === "ADMIN");

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        // Barra alta o suficiente para o alvo de toque cobrir ícone + rótulo
        // (mínimo de 44pt recomendado), com respiro sobre a borda inferior.
        //
        // A altura não é estética: o item é uma coluna flex, e o que sobra
        // depois do ícone é o que o rótulo recebe. Com 64 sobravam 9px para
        // uma linha de ~15px e o "g" de "Agenda" saía cortado — o item tem
        // padding próprio de 5px em cima e embaixo, que entra nessa conta.
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: Platform.OS === "ios" ? 88 : 68,
          paddingTop: spacing.xs,
          paddingBottom: Platform.OS === "ios" ? spacing.lg : spacing.xs + 2,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          lineHeight: 15,
          // Rótulo colado no ícone: o par lido como um bloco só, em vez de
          // dois elementos soltos.
          marginTop: 2,
        },
        tabBarIcon: ({ color, focused }) => (
          <Icon
            name={ICONS[route.name]}
            size={focused ? 24 : 22}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Agenda" component={AgendaStackNavigator} />
      <Tab.Screen name="Favoritos" component={FavoritesStackNavigator} />
      <Tab.Screen name="Mapa" component={MapStackNavigator} />
      {isAdmin && <Tab.Screen name="Admin" component={AdminStackNavigator} />}
    </Tab.Navigator>
  );
}
