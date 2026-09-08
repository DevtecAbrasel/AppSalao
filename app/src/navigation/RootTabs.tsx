import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import { colors } from "../constants/theme";
import { AgendaStackNavigator } from "./AgendaStack";
import { FavoritesStackNavigator } from "./FavoritesStack";
import { MapStackNavigator } from "./MapStack";
import { AdminStackNavigator } from "./AdminStack";
import { useAuthStore } from "../features/auth/store";
import { RootTabParamList } from "./types";

const Tab = createBottomTabNavigator<RootTabParamList>();

const ICONS: Record<keyof RootTabParamList, string> = {
  Agenda: "📅",
  Favoritos: "★",
  Mapa: "🗺️",
  Admin: "⚙️",
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
        tabBarIcon: () => <Text style={{ fontSize: 18 }}>{ICONS[route.name]}</Text>,
      })}
    >
      <Tab.Screen name="Agenda" component={AgendaStackNavigator} />
      <Tab.Screen name="Favoritos" component={FavoritesStackNavigator} />
      <Tab.Screen name="Mapa" component={MapStackNavigator} />
      {isAdmin && <Tab.Screen name="Admin" component={AdminStackNavigator} />}
    </Tab.Navigator>
  );
}
