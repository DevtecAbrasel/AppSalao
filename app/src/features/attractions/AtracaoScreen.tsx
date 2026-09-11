import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients, radius, spacing, typography } from "../../constants/theme";
import { Icon } from "../../components/Icon";
import { avisar } from "../../lib/dialog";
import { AttractionsStackParamList } from "../../navigation/types";
import { acharAtracao, Atracao } from "./atracoes";

type NavegacaoParaMapa = {
  navigate: (
    tela: "Mapa",
    params: { screen: "MapView"; params: { focusPoiKey: string } }
  ) => void;
};

// Página de uma atração. É a MESMA tela para todas: o que muda vem do dado,
// e cada bloco só aparece se a atração tiver aquilo. Uma atração com temas
// ganha a lista de temas; uma sem, não ganha um espaço vazio.
export function AtracaoScreen() {
  const { params } = useRoute<RouteProp<AttractionsStackParamList, "Atracao">>();
  const atracao = acharAtracao(params.atracaoKey);

  if (!atracao) {
    // Só acontece se um link antigo apontar para uma atração que saiu do ar.
    return (
      <View style={styles.vazio}>
        <Text style={styles.vazioTexto}>Esta atração não está mais disponível.</Text>
      </View>
    );
  }

  return <Conteudo atracao={atracao} />;
}

function Conteudo({ atracao }: { atracao: Atracao }) {
  const navigation = useNavigation<NavegacaoParaMapa>();

  const abrirLink = async () => {
    try {
      // Abre fora do app (navegador ou WhatsApp). O app continua aberto atrás,
      // então voltar é só fechar o que abriu.
      await Linking.openURL(atracao.acao.url);
    } catch {
      // Sem o link, o toque não faria nada e pareceria um botão quebrado.
      // Melhor dizer o que houve e por onde seguir.
      avisar(`Não foi possível abrir o link`, atracao.acao.ajudaSeFalhar);
    }
  };

  // Reaproveita o mapa que já existe — só pede que ele abra focado no ponto
  // desta atração. Nenhuma lógica de mapa é duplicada aqui.
  const verNoMapa = () => {
    if (!atracao.poiKey) return;
    navigation.navigate("Mapa", {
      screen: "MapView",
      params: { focusPoiKey: atracao.poiKey },
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.conteudo}>
      <LinearGradient colors={gradients.cinematic} style={styles.hero}>
        <View style={styles.heroTopo}>
          <View style={[styles.heroIcone, { borderColor: atracao.acento }]}>
            <Icon name={atracao.icone} size={22} color={atracao.acento} />
          </View>
          <View style={styles.heroNomes}>
            <Text style={styles.eyebrow}>Salão Abrasel · 2026</Text>
            <Text style={styles.nome}>{atracao.nome}</Text>
            {atracao.subtitulo ? (
              <Text style={[styles.subtitulo, { color: atracao.acento }]}>
                {atracao.subtitulo}
              </Text>
            ) : null}
          </View>
        </View>
        <Text style={styles.chamada}>{atracao.chamada}</Text>
      </LinearGradient>

      <View style={styles.corpo}>
        {atracao.selos ? (
          <View style={styles.selos}>
            {atracao.selos.map((selo) => (
              <View key={selo} style={styles.selo}>
                <Text style={styles.seloTexto}>{selo}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {atracao.paragrafos.map((paragrafo) => (
          <Text key={paragrafo} style={styles.paragrafo}>
            {paragrafo}
          </Text>
        ))}

        {atracao.temas ? (
          <>
            <Text style={styles.secaoTitulo}>{atracao.temas.titulo}</Text>
            <View style={styles.temas}>
              {atracao.temas.itens.map((tema) => (
                <View key={tema.key} style={styles.tema}>
                  <View style={styles.temaIcone}>
                    <Icon name={tema.icone} size={20} color={colors.marinho} />
                  </View>
                  <Text style={styles.temaNome}>{tema.nome}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {/* O único botão sólido da página. Tudo o mais é contorno, para não
            haver dúvida sobre qual é a ação principal. */}
        <Pressable
          style={styles.botaoPrincipal}
          onPress={abrirLink}
          accessibilityRole="link"
          accessibilityLabel={atracao.acao.rotulo}
        >
          <Icon name={atracao.acao.icone} size={20} color="#fff" />
          <Text style={styles.botaoPrincipalTexto}>{atracao.acao.rotulo}</Text>
        </Pressable>

        <View style={styles.local}>
          <View style={styles.localTexto}>
            <Text style={styles.localRotulo}>Onde</Text>
            <Text style={styles.localValor}>{atracao.onde}</Text>
            <Text style={styles.localQuando}>
              {atracao.datas} · {atracao.horario}
            </Text>
          </View>
          {atracao.poiKey ? (
            <Pressable
              style={styles.botaoMapa}
              onPress={verNoMapa}
              accessibilityRole="button"
              accessibilityLabel={`Ver ${atracao.nome} no mapa`}
            >
              <Icon name="map" size={18} color={colors.primary} />
              <Text style={styles.botaoMapaTexto}>Ver no mapa</Text>
            </Pressable>
          ) : null}
        </View>

        {atracao.nota ? <Text style={styles.nota}>{atracao.nota}</Text> : null}
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
  vazio: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  vazioTexto: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: "center",
  },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  heroTopo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  heroIcone: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    // Contorno em vez de preenchido: sobre o gradiente escuro, um quadrado
    // cheio de cor brigaria com o texto ao lado.
  },
  heroNomes: {
    flex: 1,
  },
  eyebrow: {
    ...typography.label,
    color: colors.rosa,
  },
  nome: {
    fontSize: 23,
    lineHeight: 29,
    fontWeight: "800",
    color: colors.textOnDark,
    marginTop: spacing.xs,
  },
  subtitulo: {
    ...typography.display,
    fontSize: 15,
    lineHeight: 20,
    marginTop: 2,
  },
  chamada: {
    fontSize: 15,
    lineHeight: 22,
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
    marginBottom: spacing.md,
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
    marginBottom: spacing.sm,
  },
  secaoTitulo: {
    ...typography.label,
    color: colors.primary,
    marginTop: spacing.md,
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
  botaoPrincipal: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
  },
  botaoPrincipalTexto: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    // Deixa o rótulo quebrar em duas linhas em vez de vazar do botão num
    // aparelho estreito — "Pré-cadastro Cozinha 4.0" é longo.
    flexShrink: 1,
    textAlign: "center",
  },
  local: {
    flexDirection: "row",
    flexWrap: "wrap",
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
    minWidth: 160,
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
  localQuando: {
    fontSize: 13.5,
    color: colors.textMuted,
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
  nota: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    marginTop: spacing.lg,
  },
});
