import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ExpositoresScreen } from "../features/exhibitors/ExpositoresScreen";
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
        options={{ title: "Expositores", headerRight: () => <HeaderActions /> }}
      />
    </Stack.Navigator>
  );
}
