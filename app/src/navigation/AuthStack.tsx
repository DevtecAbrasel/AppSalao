import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LoginScreen } from "../features/auth/LoginScreen";
import { SignupScreen } from "../features/auth/SignupScreen";
import { ForgotPasswordScreen } from "../features/auth/ForgotPasswordScreen";
import { ResetPasswordScreen } from "../features/auth/ResetPasswordScreen";
import { useAuthStore } from "../features/auth/store";
import { AuthStackParamList } from "./types";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStackNavigator() {
  // Quem chegou pelo link do e-mail cai direto na tela de nova senha, em vez
  // de ver o login e ter de descobrir sozinho o que fazer com o link.
  //
  // Lido uma vez, na montagem: é a rota INICIAL da pilha. Quando o token é
  // descartado, o App troca o navegador inteiro, então não há o que reagir
  // aqui dentro.
  const tokenDeRecuperacao = useAuthStore.getState().recoveryToken;

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={tokenDeRecuperacao ? "ResetPassword" : "Login"}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        initialParams={{ token: tokenDeRecuperacao ?? "" }}
      />
    </Stack.Navigator>
  );
}
