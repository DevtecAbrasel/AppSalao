import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, gradients, radius, spacing, typography } from "../../constants/theme";
import { Icon } from "../../components/Icon";
import { LogoSalao } from "../../components/LogoSalao";
import { AuthStackParamList } from "../../navigation/types";
import { useAuthStore } from "./store";

type Props = NativeStackScreenProps<AuthStackParamList, "ResetPassword">;

const MIN_PASSWORD_LENGTH = 8;

// Tela aberta pelo link do e-mail. Não há caminho para ela dentro do app: sem
// o token na URL, a pilha de entrada nem a mostra.
export function ResetPasswordScreen({ navigation, route }: Props) {
  const { token } = route.params;
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const descartarRecuperacao = useAuthStore((s) => s.descartarRecuperacao);
  const [password, setPassword] = useState("");
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`);
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      // Deu certo, a store já limpa o link do endereço e entra na conta — o
      // App troca sozinho para o app logado.
      await resetPassword(token, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao redefinir a senha");
      setSubmitting(false);
    }
  };

  const voltarParaLogin = () => {
    // Descarta o link: deixá-lo no endereço faria esta tela voltar sozinha no
    // próximo carregamento, e prenderia aqui quem já tinha sessão aberta.
    descartarRecuperacao();
    navigation.navigate("Login");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient colors={gradients.cinematic} style={styles.hero}>
        <LogoSalao width={180} />
        <Text style={styles.eyebrow}>Edição 2026</Text>
        <Text style={styles.title}>Nova Senha</Text>
        <Text style={styles.subtitle}>
          Escolha a senha que você vai usar para entrar no app do evento.
        </Text>
      </LinearGradient>

      <View style={styles.corpo}>
        <View style={styles.form}>
          <Text style={styles.campoLabel}>Nova senha</Text>
          <View style={styles.senhaWrapper}>
            <TextInput
              style={styles.senhaInput}
              placeholder={`Mínimo de ${MIN_PASSWORD_LENGTH} caracteres`}
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!senhaVisivel}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />
            {/* Sem campo de confirmação: com o olho, a pessoa confere o que
                digitou, que é o mesmo que a confirmação garante — e é o
                arranjo que a tela de criar conta já usa. */}
            <Pressable
              onPress={() => setSenhaVisivel((v) => !v)}
              style={styles.olhoBotao}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={senhaVisivel ? "Ocultar senha" : "Mostrar senha"}
            >
              <Icon name={senhaVisivel ? "eye-off" : "eye"} size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          {error && (
            <View style={styles.erroBloco}>
              <Text style={styles.error}>{error}</Text>
            </View>
          )}
        </View>

        <Pressable
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting || !password}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Salvar e entrar</Text>
          )}
        </Pressable>

        <Pressable onPress={voltarParaLogin} style={styles.linkWrapper}>
          <Text style={styles.link}>Voltar para entrar</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl * 1.5,
    paddingBottom: spacing.xl,
  },
  eyebrow: {
    ...typography.label,
    color: colors.rosa,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.display,
    fontSize: 34,
    lineHeight: 38,
    color: colors.textOnDark,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.azulClaro,
    marginTop: spacing.md,
  },
  corpo: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
  },
  form: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  campoLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  senhaWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingRight: spacing.xs,
  },
  senhaInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: 15,
    color: colors.text,
  },
  olhoBotao: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  erroBloco: {
    marginTop: spacing.sm,
  },
  error: {
    color: colors.live,
    fontSize: 13,
    lineHeight: 19,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm + 4,
    alignItems: "center",
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  linkWrapper: {
    marginTop: spacing.lg,
    alignItems: "center",
  },
  link: {
    color: colors.marinho,
    fontSize: 14,
    fontWeight: "600",
  },
});
