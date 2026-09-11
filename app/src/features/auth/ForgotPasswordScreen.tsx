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
import { forgotPassword } from "./api";

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;

export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Quando chega, é a frase do servidor — que é a mesma exista ou não a
  // conta, de propósito.
  const [aviso, setAviso] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const { message } = await forgotPassword(email.trim());
      setAviso(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o link");
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
        <Text style={styles.title}>Esqueci{"\n"}Minha Senha</Text>
        <Text style={styles.subtitle}>
          Informe o e-mail da sua conta e enviamos um link para você escolher uma
          nova senha.
        </Text>
      </LinearGradient>

      <View style={styles.corpo}>
        {aviso ? (
          // Estado de "pronto, confira a caixa de entrada". O formulário sai
          // de cena: deixá-lo ali convidaria a mandar o mesmo pedido de novo
          // achando que o primeiro não funcionou.
          <View style={styles.form}>
            <View style={styles.confirmacao}>
              <Icon name="mail" size={22} color={colors.primary} />
              <Text style={styles.confirmacaoTexto}>{aviso}</Text>
            </View>
            <Text style={styles.dica}>
              O link vale por 1 hora. Se não aparecer em alguns minutos, verifique
              o spam ou tente outro e-mail.
            </Text>
          </View>
        ) : (
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
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />

            {error && <Text style={styles.error}>{error}</Text>}
          </View>
        )}

        {!aviso && (
          <Pressable
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting || !email}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Enviar link</Text>
            )}
          </Pressable>
        )}

        <Pressable onPress={() => navigation.navigate("Login")} style={styles.linkWrapper}>
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
  confirmacao: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  confirmacaoTexto: {
    flex: 1,
    fontSize: 14.5,
    lineHeight: 21,
    color: colors.text,
  },
  dica: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  error: {
    color: colors.live,
    fontSize: 13,
    lineHeight: 19,
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
