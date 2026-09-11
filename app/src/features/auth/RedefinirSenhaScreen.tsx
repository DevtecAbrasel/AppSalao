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
import { redefinirSenha } from "./api";

type Props = NativeStackScreenProps<AuthStackParamList, "RedefinirSenha">;

const MIN_PASSWORD_LENGTH = 8;

// Troca de senha feita dentro do app: o e-mail localiza a conta, e a nova
// senha entra no lugar da antiga. Quem valida e grava é o servidor — aqui só
// se evita mandar um pedido que já se sabe inválido.
export function RedefinirSenhaScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  // Um interruptor só para os dois campos: são a mesma senha sendo digitada
  // duas vezes, e conferir uma escondendo a outra não ajudaria em nada.
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);

  const validar = (): string | null => {
    if (!email.trim()) return "Informe o e-mail da sua conta";
    if (!senha) return "Informe a nova senha";
    if (senha.length < MIN_PASSWORD_LENGTH) {
      return `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`;
    }
    if (!confirmacao) return "Confirme a nova senha";
    if (senha !== confirmacao) return "As senhas não são iguais";
    return null;
  };

  const handleSubmit = async () => {
    const problema = validar();
    if (problema) {
      setErro(problema);
      return;
    }

    setErro(null);
    setSubmitting(true);
    try {
      await redefinirSenha(email.trim(), senha);
      setPronto(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível alterar a senha");
    } finally {
      setSubmitting(false);
    }
  };

  if (pronto) {
    return (
      <View style={styles.container}>
        <Cabecalho titulo="Senha alterada" />
        <View style={styles.corpo}>
          <View style={styles.sucesso}>
            <Icon name="check-circle" size={22} color={colors.primary} />
            <Text style={styles.sucessoTexto}>
              Pronto. Entre com a sua nova senha.
            </Text>
          </View>

          <Pressable
            style={styles.botao}
            onPress={() =>
              navigation.navigate("Login", { aviso: "Senha alterada. Entre com a nova senha." })
            }
            accessibilityRole="button"
          >
            <Text style={styles.botaoTexto}>Ir para o login</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.rolagem} keyboardShouldPersistTaps="handled">
        <Cabecalho titulo="Redefinir senha" />

        <View style={styles.corpo}>
          <Text style={styles.explicacao}>
            Informe o e-mail que você usa para entrar e escolha uma nova senha.
          </Text>

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

          <Text style={[styles.campoLabel, styles.campoLabelSegundo]}>Nova senha</Text>
          <CampoSenha
            placeholder={`Mínimo de ${MIN_PASSWORD_LENGTH} caracteres`}
            value={senha}
            onChangeText={setSenha}
            visivel={senhaVisivel}
            onAlternar={() => setSenhaVisivel((v) => !v)}
          />

          <Text style={[styles.campoLabel, styles.campoLabelSegundo]}>
            Confirmar nova senha
          </Text>
          <CampoSenha
            placeholder="Repita a nova senha"
            value={confirmacao}
            onChangeText={setConfirmacao}
            visivel={senhaVisivel}
            onAlternar={() => setSenhaVisivel((v) => !v)}
            onSubmit={handleSubmit}
          />

          {erro && (
            <View style={styles.erro}>
              <Icon name="error" size={18} color={colors.live} />
              <Text style={styles.erroTexto}>{erro}</Text>
            </View>
          )}

          <Pressable
            style={[styles.botao, submitting && styles.botaoDesabilitado]}
            onPress={handleSubmit}
            disabled={submitting}
            accessibilityRole="button"
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.botaoTexto}>Alterar senha</Text>
            )}
          </Pressable>

          <Pressable onPress={() => navigation.navigate("Login")} style={styles.linkWrapper}>
            <Text style={styles.link}>Voltar para entrar</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Cabecalho({ titulo }: { titulo: string }) {
  return (
    <View style={styles.cabecalho}>
      <LogoSalao width={150} centralizada />
      <Text style={styles.titulo}>{titulo}</Text>
    </View>
  );
}

interface CampoSenhaProps {
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  visivel: boolean;
  onAlternar: () => void;
  onSubmit?: () => void;
}

// Mesmo arranjo do campo de senha do login: o olho é irmão do campo dentro do
// container com a moldura, e não filho dele, para a área de toque não
// disputar espaço com o texto.
function CampoSenha({
  placeholder,
  value,
  onChangeText,
  visivel,
  onAlternar,
  onSubmit,
}: CampoSenhaProps) {
  return (
    <View style={styles.senhaWrapper}>
      <TextInput
        style={styles.senhaInput}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!visivel}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="new-password"
        returnKeyType={onSubmit ? "go" : "next"}
        onSubmitEditing={onSubmit}
      />
      <Pressable
        onPress={onAlternar}
        style={styles.olhoBotao}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={visivel ? "Ocultar senha" : "Mostrar senha"}
      >
        <Icon name={visivel ? "eye-off" : "eye"} size={20} color={colors.textMuted} />
      </Pressable>
    </View>
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
  cabecalho: {
    backgroundColor: colors.marinho,
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl * 1.5,
    paddingBottom: spacing.xl,
  },
  titulo: {
    ...typography.display,
    fontSize: 26,
    lineHeight: 32,
    color: colors.textOnDark,
    marginTop: spacing.lg,
    textAlign: "center",
  },
  corpo: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  explicacao: {
    fontSize: 14.5,
    lineHeight: 21,
    color: colors.textMuted,
    marginBottom: spacing.lg,
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
  sucesso: {
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
  sucessoTexto: {
    flex: 1,
    fontSize: 14.5,
    lineHeight: 21,
    color: colors.text,
  },
  botao: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm + 4,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  botaoDesabilitado: {
    opacity: 0.7,
  },
  botaoTexto: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  linkWrapper: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    alignItems: "center",
  },
  link: {
    color: colors.marinho,
    fontSize: 14,
    fontWeight: "600",
  },
});
