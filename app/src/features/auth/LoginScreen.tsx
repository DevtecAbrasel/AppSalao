import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, gradients, radius, spacing, typography } from "../../constants/theme";
import { Icon } from "../../components/Icon";
import { LogoSalao } from "../../components/LogoSalao";
import { AuthStackParamList } from "../../navigation/types";
import { useAuthStore } from "./store";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Só controla a exibição: o valor de `password` nunca é tocado por isto, e
  // o envio usa sempre o estado, visível ou não.
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao entrar");
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
        <Text style={styles.title}>Aberto{"\n"}Para O Futuro</Text>
        <Text style={styles.subtitle}>Entre para ver e favoritar a programação</Text>
      </LinearGradient>

      {/* Coluna com largura máxima: no navegador em tela cheia um campo de
          e-mail com 1200px de largura fica desproporcional, e o olho da senha
          vai parar longe demais do texto que ele revela. */}
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
          {/* O ícone é irmão do campo dentro de um container com a moldura, e
              não filho dele: assim a área de toque não disputa espaço com o
              texto e o campo continua um TextInput simples. */}
          <View style={styles.senhaWrapper}>
            <TextInput
              style={styles.senhaInput}
              placeholder="Sua senha"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!senhaVisivel}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
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

          {/* Logo abaixo do campo de senha, que é onde a pessoa descobre que
              não lembra dela — e não no fim da tela, depois do botão de criar
              conta. */}
          <Pressable
            onPress={() => navigation.navigate("ForgotPassword")}
            style={styles.esqueciWrapper}
            hitSlop={6}
          >
            <Text style={styles.esqueci}>Esqueci minha senha</Text>
          </Pressable>

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
            <Text style={styles.buttonText}>Entrar</Text>
          )}
        </Pressable>

        <Pressable onPress={() => navigation.navigate("Signup")} style={styles.linkWrapper}>
          <Text style={styles.link}>Não tem conta? Criar conta</Text>
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
  corpo: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
  },
  // Formulário num bloco só, com a margem lateral aplicada uma vez — antes
  // cada campo carregava a própria margem, o que espalha a decisão de layout.
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
  // Mesma moldura do input, porém como container: o TextInput dentro fica sem
  // borda para não desenhar uma segunda.
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
  // 44×44 é o alvo mínimo confortável para toque; o ícone de 20 fica centrado.
  olhoBotao: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  esqueciWrapper: {
    alignSelf: "flex-start",
    marginTop: spacing.sm,
  },
  esqueci: {
    color: colors.primary,
    fontSize: 13.5,
    fontWeight: "700",
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
