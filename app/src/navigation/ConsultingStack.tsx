import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ConsultoriasScreen } from "../features/consulting/ConsultoriasScreen";
import { HeaderActions } from "./HeaderActions";
import { colors } from "../constants/theme";
import { ConsultingStackParamList } from "./types";

const Stack = createNativeStackNavigator<ConsultingStackParamList>();

export function ConsultingStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
      }}
    >
      <Stack.Screen
        name="ConsultingHome"
        component={ConsultoriasScreen}
        options={{ title: "Consultorias", headerRight: () => <HeaderActions /> }}
      />
    </Stack.Navigator>
  );
}
