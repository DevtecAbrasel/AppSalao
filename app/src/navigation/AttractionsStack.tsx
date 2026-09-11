import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AtracoesScreen } from "../features/attractions/AtracoesScreen";
import { ConsultoriasScreen } from "../features/consulting/ConsultoriasScreen";
import { NotificationsScreen } from "../features/notifications/NotificationsScreen";
import { HeaderActions } from "./HeaderActions";
import { colors } from "../constants/theme";
import { AttractionsStackParamList } from "./types";

const Stack = createNativeStackNavigator<AttractionsStackParamList>();

export function AttractionsStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen
        name="AtracoesList"
        component={AtracoesScreen}
        options={({ navigation }) => ({
          title: "+ Atrações",
          headerRight: () => <HeaderActions navigation={navigation} />,
        })}
      />
      {/* A consultoria é uma atração com tela própria: o cartão empilha aqui,
          dentro da aba, e o "voltar" devolve à lista. */}
      <Stack.Screen
        name="Consultorias"
        component={ConsultoriasScreen}
        options={{ title: "Orientação com especialistas" }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: "Notificações" }}
      />
    </Stack.Navigator>
  );
}
