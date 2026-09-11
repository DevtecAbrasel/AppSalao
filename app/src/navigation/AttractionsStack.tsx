import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AtracoesScreen } from "../features/attractions/AtracoesScreen";
import { AtracaoScreen } from "../features/attractions/AtracaoScreen";
import { acharAtracao } from "../features/attractions/atracoes";
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
      {/* Uma rota para TODAS as atrações: o cartão empilha aqui, dentro da
          aba, e o "voltar" devolve à lista. O cabeçalho pega o nome do dado,
          então uma atração nova não precisa de rota nem de tela nova. */}
      <Stack.Screen
        name="Atracao"
        component={AtracaoScreen}
        options={({ route }) => ({
          title: acharAtracao(route.params.atracaoKey)?.nome ?? "Atração",
        })}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: "Notificações" }}
      />
    </Stack.Navigator>
  );
}
