import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients, radius, spacing, typography } from "../../constants/theme";
import { Icon } from "../../components/Icon";
import { avisar } from "../../lib/dialog";
import { LINK_AGENDAMENTO, LOCAL_ATENDIMENTO, TEMAS } from "./consultorias";

type NavegacaoParaMapa = {
  navigate: (
    tela: "Mapa",
    params: { screen: "MapView"; params: { focusPoiKey: string } }
  ) => void;
};

export function ConsultoriasScreen() {
  const navigation = useNavigation<NavegacaoParaMapa>();

  const agendar = async () => {
    try {
      await Linking.openURL(LINK_AGENDAMENTO);
    } catch {
      // Sem WhatsApp instalado (ou navegador bloqueando), o toque não faria
      // nada e pareceria um botão quebrado. Melhor dizer o que houve.
      avisar(
        "Não foi possível abrir o WhatsApp",
        "Tente novamente ou procure o estande da Abrasel para agendar pessoalmente."
      );
    }
  };

  const verNoMapa = () => {
    navigation.navigate("Mapa", {
      screen: "MapView",
      params: { focusPoiKey: LOCAL_ATENDIMENTO.poiKey },
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.conteudo}>
      <LinearGradient colors={gradients.cinematic} style={styles.hero}>
        <Text style={styles.eyebrow}>Salão Abrasel · 2026</Text>
        <Text style={styles.titulo}>Tire dúvidas do seu negócio com especialistas</Text>
        <Text style={styles.subtitulo}>
          Plantões de atendimento individual no estande da Abrasel, com profissionais
          parceiros preparados para conversar sobre desafios reais da sua operação.
        </Text>
      </LinearGradient>

      <View style={styles.corpo}>
        {/* As três condições do atendimento vêm antes de tudo: é o que decide
            se a pessoa continua lendo ou não. */}
        <View style={styles.selos}>
          <View style={styles.selo}>
            <Text style={styles.seloTexto}>Individual</Text>
          </View>
          <View style={styles.selo}>
            <Text style={styles.seloTexto}>Agendado</Text>
          </View>
          <View style={styles.selo}>
            <Text style={styles.seloTexto}>Até 20 min</Text>
          </View>
        </View>

        <Text style={styles.paragrafo}>
          É uma oportunidade para levar uma dúvida, problema ou desafio específico do
          seu negócio e receber uma orientação inicial de quem entende do assunto.
        </Text>

        <Text style={styles.secaoTitulo}>Temas disponíveis</Text>
        <View style={styles.temas}>
          {TEMAS.map((tema) => (
            <View key={tema.key} style={styles.tema}>
              <View style={styles.temaIcone}>
                <Icon name={tema.icone} size={20} color={colors.marinho} />
              </View>
              <Text style={styles.temaNome}>{tema.nome}</Text>
            </View>
          ))}
        </View>

        <Pressable
          style={styles.botaoAgendar}
          onPress={agendar}
          accessibilityRole="button"
          accessibilityLabel="Agende seu horário pelo WhatsApp"
        >
          <Icon name="chat" size={20} color="#fff" />
          <Text style={styles.botaoAgendarTexto}>Agende seu horário</Text>
        </Pressable>

        <View style={styles.local}>
          <View style={styles.localTexto}>
            <Text style={styles.localRotulo}>Onde</Text>
            <Text style={styles.localValor}>{LOCAL_ATENDIMENTO.descricao}</Text>
          </View>
          <Pressable
            style={styles.botaoMapa}
            onPress={verNoMapa}
            accessibilityRole="button"
            accessibilityLabel="Ver o estande da Abrasel no mapa"
          >
            <Icon name="map" size={18} color={colors.primary} />
            <Text style={styles.botaoMapaTexto}>Ver no mapa</Text>
          </Pressable>
        </View>

        <Text style={styles.aviso}>
          As vagas são limitadas e preenchidas conforme disponibilidade.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  conteudo: {
    paddingBottom: spacing.xl,
  },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  eyebrow: {
    ...typography.label,
    color: colors.rosa,
    marginBottom: spacing.sm,
  },
  titulo: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    color: colors.textOnDark,
  },
  subtitulo: {
    fontSize: 14.5,
    lineHeight: 21,
    color: colors.azulClaro,
    marginTop: spacing.md,
  },
  // Coluna com teto: numa tela larga o texto não vira uma linha de ponta a
  // ponta, e no celular não muda nada (o teto é maior que a tela).
  corpo: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  selos: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  selo: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
  },
  seloTexto: {
    fontSize: 12.5,
    fontWeight: "700",
    color: colors.text,
  },
  paragrafo: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
  secaoTitulo: {
    ...typography.label,
    color: colors.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  temas: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  tema: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  temaIcone: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceCream,
  },
  temaNome: {
    flex: 1,
    fontSize: 14.5,
    fontWeight: "600",
    color: colors.text,
  },
  // O único botão sólido da tela. Tudo o mais é contorno, para não haver
  // dúvida sobre qual é a ação principal.
  botaoAgendar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  botaoAgendarTexto: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  local: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.secondary,
  },
  localTexto: {
    flex: 1,
  },
  localRotulo: {
    ...typography.label,
    color: colors.textMuted,
  },
  localValor: {
    fontSize: 14.5,
    fontWeight: "600",
    color: colors.text,
    marginTop: 2,
  },
  botaoMapa: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
  },
  botaoMapaTexto: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.primary,
  },
  aviso: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    marginTop: spacing.lg,
  },
});
