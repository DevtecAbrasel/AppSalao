import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { Icon } from "../../components/Icon";
import { LogoSalao } from "../../components/LogoSalao";
import { AuthStackParamList } from "../../navigation/types";
import { useAuthStore } from "./store";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation, route }: Props) {
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Só controla a exibição: o valor de `password` nunca é tocado por isto, e
  // o envio usa sempre o estado, visível ou não.
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Confirmação vinda de outra tela (a senha acabou de ser alterada). Some no
  // primeiro erro: a tela não pode dizer "deu certo" e "deu errado" ao mesmo
  // tempo.
  const [aviso, setAviso] = useState<string | null>(route.params?.aviso ?? null);

  const handleSubmit = async () => {
    setError(null);
    setAviso(null);
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
      <ScrollView contentContainerStyle={styles.rolagem} keyboardShouldPersistTaps="handled">
        {/* Marca em bloco marinho chapado, centralizada e do tamanho de um
            letreiro: é a primeira coisa que se vê ao abrir, e o que responde
            "este é o app oficial do evento" antes de qualquer texto. Chapado,
            e não em degradê, para não competir com o próprio logo. */}
        <View style={styles.marca}>
          <LogoSalao width={200} centralizada />
          <Text style={styles.assinatura}>Edição 2026 · Aberto para o futuro</Text>
        </View>

        {/* Coluna com largura máxima: no navegador em tela cheia um campo de
            e-mail com 1200px de largura fica desproporcional, e o olho da senha
            vai parar longe demais do texto que ele revela. */}
        <View style={styles.corpo}>
          {aviso && (
            <View style={styles.aviso}>
              <Icon name="check-circle" size={18} color={colors.primary} />
              <Text style={styles.avisoTexto}>{aviso}</Text>
            </View>
          )}

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
            onPress={() => navigation.navigate("RedefinirSenha")}
            style={styles.esqueciWrapper}
            hitSlop={6}
          >
            <Text style={styles.esqueci}>Esqueci minha senha</Text>
          </Pressable>

          {error && (
            <View style={styles.erro}>
              <Icon name="error" size={18} color={colors.live} />
              <Text style={styles.erroTexto}>{error}</Text>
            </View>
          )}

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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  rolagem: {
    flexGrow: 1,
  },
  marca: {
    backgroundColor: colors.marinho,
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl * 1.5,
    paddingBottom: spacing.xl,
  },
  assinatura: {
    ...typography.label,
    color: colors.rosa,
    marginTop: spacing.lg,
    textAlign: "center",
  },
  corpo: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
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
  aviso: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.lg,
    padding: spacing.sm + 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  avisoTexto: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  erro: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.sm + 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.live,
  },
  erroTexto: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm + 4,
    alignItems: "center",
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
