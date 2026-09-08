import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { MapScreen } from "../features/map/MapScreen";
import { EventDetailScreen } from "../features/events/EventDetailScreen";
import { NotificationsScreen } from "../features/notifications/NotificationsScreen";
import { HeaderActions } from "./HeaderActions";
import { colors } from "../constants/theme";
import { MapStackParamList } from "./types";

const Stack = createNativeStackNavigator<MapStackParamList>();

export function MapStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen
        name="MapView"
        component={MapScreen}
        options={{ title: "Mapa do Evento", headerRight: () => <HeaderActions /> }}
      />
      <Stack.Screen
        name="EventDetail"
        component={EventDetailScreen}
        options={{ title: "Detalhes" }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: "Notificações" }}
      />
    </Stack.Navigator>
  );
}
