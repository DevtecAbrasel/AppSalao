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

type Props = NativeStackScreenProps<AuthStackParamList, "Signup">;

const MIN_PASSWORD_LENGTH = 8;

export function SignupScreen({ navigation }: Props) {
  const register = useAuthStore((s) => s.register);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Aqui o "mostrar senha" pesa ainda mais que no login: é uma senha sendo
  // criada, com mínimo de caracteres, e não há campo de confirmação.
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
      await register(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar conta");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient colors={gradients.cinematic} style={styles.hero}>
        <LogoSalao width={180} />
        <Text style={styles.eyebrow}>Edição 2026</Text>
        <Text style={styles.title}>Criar Conta</Text>
        <Text style={styles.subtitle}>
          Salve seus favoritos e receba notificações das palestras que escolher.
        </Text>
      </LinearGradient>

      <View style={styles.corpo}>
        <View style={styles.form}>
          <Text style={styles.campoLabel}>E-mail</Text>
          <TextInput
            style={styles.input}
            placeholder="voce@exemplo.com"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            returnKeyType="next"
          />

          <Text style={[styles.campoLabel, styles.campoLabelSegundo]}>Senha</Text>
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

          {error && <Text style={styles.error}>{error}</Text>}
        </View>

        <Pressable
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting || !email || !password}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Criar conta</Text>
          )}
        </Pressable>

        <Pressable onPress={() => navigation.navigate("Login")} style={styles.linkWrapper}>
          <Text style={styles.link}>Já tem conta? Entrar</Text>
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
    color: colors.azulClaro,
    marginTop: spacing.md,
  },
  // Mesmas medidas do login (ver LoginScreen): as duas telas são a mesma
  // porta de entrada e trocar de uma para a outra não pode mexer no layout.
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
  campoLabelSegundo: {
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: 15,
    color: colors.text,
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
  error: {
    color: colors.live,
    fontSize: 13,
    marginTop: spacing.sm,
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
