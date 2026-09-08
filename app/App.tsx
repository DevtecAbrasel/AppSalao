import { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer, NavigationContainerRef } from "@react-navigation/native";
import { RootTabs } from "./src/navigation/RootTabs";
import { AuthStackNavigator } from "./src/navigation/AuthStack";
import { RootTabParamList } from "./src/navigation/types";
import { useAuthStore } from "./src/features/auth/store";
import { useNotificationsStore } from "./src/features/notifications/store";
import { NotificationToast } from "./src/features/notifications/NotificationToast";
import { colors } from "./src/constants/theme";

export default function App() {
  const navigationRef = useRef<NavigationContainerRef<RootTabParamList>>(null);
  const authStatus = useAuthStore((s) => s.status);
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // As notificações in-app só existem para um usuário logado: o polling liga
  // ao autenticar e desliga (limpando o estado) ao sair, pra não vazar aviso
  // de uma conta para a próxima.
  useEffect(() => {
    const { startPolling, stopPolling, reset } = useNotificationsStore.getState();

    if (authStatus === "authenticated") {
      startPolling();
      return () => stopPolling();
    }

    stopPolling();
    reset();
  }, [authStatus]);

  if (authStatus === "hydrating") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer ref={navigationRef}>
          {authStatus === "authenticated" ? <RootTabs /> : <AuthStackNavigator />}
        </NavigationContainer>

        {/* Fora do NavigationContainer, mas por cima dele: o toast flutua
            sobre qualquer tela sem entrar na pilha de navegação. */}
        {authStatus === "authenticated" && (
          <NotificationToast
            onOpenEvent={(eventId) =>
              navigationRef.current?.navigate("Agenda", {
                screen: "EventDetail",
                params: { eventId },
              })
            }
          />
        )}

        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
