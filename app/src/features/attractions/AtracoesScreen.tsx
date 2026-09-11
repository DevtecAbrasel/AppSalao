import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients, radius, spacing } from "../../constants/theme";
import { Icon, IconName } from "../../components/Icon";
import { Atracao, ATRACOES } from "./atracoes";

type Navegacao = {
  push: (tela: "Consultorias") => void;
  navigate: (
    tela: "Mapa",
    params: { screen: "MapView"; params: { focusPoiKey: string } }
  ) => void;
};

// Vitrine das atrações do salão: um cartão por atração, na ordem em que a
// organização as apresenta.
//
// O cartão inteiro é a área de toque, e não só o botão do canto — no celular
// acertar um alvo do tamanho do cartão é bem mais fácil do que acertar uma
// pílula de 40px. Por isso "Saiba mais" é desenho, não um segundo botão: dois
// alvos empilhados só criariam a dúvida de qual deles vale.
export function AtracoesScreen() {
  const navigation = useNavigation<Navegacao>();

  const abrir = (atracao: Atracao) => {
    // Tela própria quando existe; senão, o que temos de concreto sobre a
    // atração é onde ela fica.
    if (atracao.tela) {
      navigation.push(atracao.tela);
      return;
    }
    if (atracao.poiKey) {
      navigation.navigate("Mapa", {
        screen: "MapView",
        params: { focusPoiKey: atracao.poiKey },
      });
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.conteudo}>
      <View style={styles.coluna}>
        <Text style={styles.abertura}>
          Além das palestras e das arenas, o Salão Abrasel tem atrações para
          viver novas experiências, conhecer tendências e conversar com quem
          entende do assunto.
        </Text>

        {ATRACOES.map((atracao) => (
          <Cartao key={atracao.key} atracao={atracao} onPress={() => abrir(atracao)} />
        ))}
      </View>
    </ScrollView>
  );
}

function Cartao({ atracao, onPress }: { atracao: Atracao; onPress: () => void }) {
  const acao = atracao.tela ? "Saiba mais" : "Ver no mapa";

  return (
    <Pressable
      style={({ pressed }) => [styles.cartao, pressed && styles.cartaoPressionado]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${atracao.nome}. ${acao}.`}
    >
      {/* Faixa do topo no lugar da foto: fundo da marca, barra de acento e o
          ícone da atração. Sem texto de propósito — o nome já é o título logo
          abaixo, e repeti-lo aqui só empurraria o conteúdo para baixo. Quando
          a organização mandar as imagens, é esta faixa que sai; o resto do
          cartão fica igual. */}
      <LinearGradient colors={gradients.cinematic} style={styles.faixa}>
        <View style={[styles.acento, { backgroundColor: atracao.acento }]} />
        <Icon name={atracao.icone} size={44} color={atracao.acento} />
      </LinearGradient>

      <View style={styles.corpo}>
        <Text style={styles.titulo}>{atracao.nome}</Text>
        <Text style={styles.descricao}>{atracao.descricao}</Text>

        <View style={styles.rodape}>
          <View style={styles.dados}>
            <Dado icone="place" texto={atracao.local} />
            <Dado icone="calendar" texto={atracao.datas} />
            <Dado icone="schedule" texto={atracao.horario} />
          </View>

          <View style={styles.acaoPilula}>
            <Text style={styles.acaoTexto}>{acao}</Text>
            <Icon name="chevron-right" size={16} color={colors.primary} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function Dado({ icone, texto }: { icone: IconName; texto: string }) {
  return (
    <View style={styles.dado}>
      <Icon name={icone} size={16} color={colors.textMuted} />
      <Text style={styles.dadoTexto}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  conteudo: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  // Coluna com teto: numa tela larga os cartões não esticam de ponta a ponta,
  // e no celular o teto é maior que a tela, então nada muda.
  coluna: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    gap: spacing.md,
  },
  abertura: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  cartao: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  cartaoPressionado: {
    opacity: 0.85,
  },
  faixa: {
    height: 92,
    alignItems: "center",
    justifyContent: "center",
  },
  // Barra vertical de acento encostada na borda esquerda — o mesmo recurso
  // que o cartão de local das consultorias já usa.
  acento: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  corpo: {
    padding: spacing.md,
  },
  titulo: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "800",
    color: colors.text,
  },
  descricao: {
    fontSize: 14.5,
    lineHeight: 21,
    color: colors.textMuted,
    marginTop: spacing.xs + 2,
  },
  // Dados à esquerda, ação à direita. `flexWrap` porque em tela estreita a
  // pílula desce em vez de espremer as linhas de local/data/horário.
  rodape: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  dados: {
    gap: spacing.xs + 1,
  },
  dado: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
  },
  dadoTexto: {
    fontSize: 13.5,
    color: colors.text,
  },
  acaoPilula: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
  },
  acaoTexto: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.primary,
  },
});
