import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AgendaScreen } from "../features/events/AgendaScreen";
import { EventDetailScreen } from "../features/events/EventDetailScreen";
import { NotificationsScreen } from "../features/notifications/NotificationsScreen";
import { NotificationBell } from "../features/notifications/NotificationBell";
import { colors } from "../constants/theme";
import { AgendaStackParamList } from "./types";

const Stack = createNativeStackNavigator<AgendaStackParamList>();

export function AgendaStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen
        name="AgendaList"
        component={AgendaScreen}
        options={{ title: "Agenda", headerRight: () => <NotificationBell /> }}
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
