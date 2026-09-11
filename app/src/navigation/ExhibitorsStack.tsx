import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ExpositoresScreen } from "../features/exhibitors/ExpositoresScreen";
import { NotificationsScreen } from "../features/notifications/NotificationsScreen";
import { HeaderActions } from "./HeaderActions";
import { colors } from "../constants/theme";
import { ExhibitorsStackParamList } from "./types";

const Stack = createNativeStackNavigator<ExhibitorsStackParamList>();

export function ExhibitorsStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen
        name="ExhibitorsList"
        component={ExpositoresScreen}
        options={({ navigation }) => ({
          title: "Expositores",
          headerRight: () => <HeaderActions navigation={navigation} />,
        })}
      />
      {/* Registrada aqui pelo mesmo motivo dos outros stacks: o cabeçalho
          desta aba mostra o sino, e sem a rota local o toque abriria a tela na
          aba Agenda, trocando a aba por baixo de quem estava consultando os
          expositores. */}
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: "Notificações" }}
      />
    </Stack.Navigator>
  );
}
