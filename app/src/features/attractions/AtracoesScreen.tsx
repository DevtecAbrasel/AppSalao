import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients, radius, spacing, typography } from "../../constants/theme";
import { Icon, IconName } from "../../components/Icon";
import { Atracao, ATRACOES } from "./atracoes";

type Navegacao = {
  push: (tela: "Atracao", params: { atracaoKey: string }) => void;
};

// Vitrine das atrações do salão: um cartão por atração, na ordem em que a
// organização as apresenta. Cada cartão abre a página da atração, que é uma
// tela só para todas elas (`AtracaoScreen`).
//
// O cartão inteiro é a área de toque, e não só o botão do canto — no celular
// acertar um alvo do tamanho do cartão é bem mais fácil do que acertar uma
// pílula de 40px. Por isso "Saiba mais" é desenho, não um segundo botão: dois
// alvos empilhados só criariam a dúvida de qual deles vale.
export function AtracoesScreen() {
  const navigation = useNavigation<Navegacao>();

  // `push` e não `navigate`: empilha DENTRO desta aba, então o voltar devolve
  // à lista em vez de trocar a aba por baixo de quem tocou.
  const abrir = (atracao: Atracao) =>
    navigation.push("Atracao", { atracaoKey: atracao.key });

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
  return (
    <Pressable
      style={({ pressed }) => [styles.cartao, pressed && styles.cartaoPressionado]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${atracao.nome}. Saiba mais.`}
    >
      {/* Topo do cartão: a foto da atração quando existe; senão, a faixa da
          marca com o ícone. A caixa é a mesma nos dois casos, então a lista
          não fica desalinhada enquanto só parte das atrações tem foto.
          `cover` é o que garante que a foto preencha sem esticar: o que não
          couber é aparado, e nada é distorcido. */}
      {/* A caixa é quem manda na altura, e a foto preenche por dentro: dar a
          proporção à própria <Image> não funciona — o react-native-web deixa
          a altura natural do arquivo, e uma foto de 764px de altura viraria
          um bloco gigante no meio da lista. */}
      <View style={styles.topo}>
        {atracao.imagem ? (
          <Image
            source={atracao.imagem}
            style={styles.foto}
            resizeMode="cover"
            accessibilityRole="image"
            accessibilityLabel={atracao.nome}
          />
        ) : (
          <LinearGradient colors={gradients.cinematic} style={styles.faixa}>
            <View style={[styles.acento, { backgroundColor: atracao.acento }]} />
            <Icon name={atracao.icone} size={44} color={atracao.acento} />
          </LinearGradient>
        )}
      </View>

      <View style={styles.corpo}>
        <Text style={styles.titulo}>{atracao.nome}</Text>
        {atracao.subtitulo ? (
          <Text style={[styles.subtitulo, { color: atracao.acento }]}>
            {atracao.subtitulo}
          </Text>
        ) : null}
        <Text style={styles.descricao}>{atracao.resumo}</Text>

        <View style={styles.rodape}>
          <View style={styles.dados}>
            <Dado icone="place" texto={atracao.local} />
            <Dado icone="calendar" texto={atracao.datas} />
            <Dado icone="schedule" texto={atracao.horario} />
          </View>

          <View style={styles.acaoPilula}>
            <Text style={styles.acaoTexto}>Saiba mais</Text>
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
  // Altura pela proporção, e não fixa: numa tela larga o cartão cresce e uma
  // altura travada em 92px transformaria a foto numa tarja. 2.8:1 é o formato
  // das fotos da organização, então elas entram praticamente sem corte.
  topo: {
    width: "100%",
    // 2.88:1 é o formato das fotos da organização (764×265), então elas
    // entram praticamente sem corte. Proporção em vez de altura fixa: numa
    // tela larga o cartão cresce, e uma altura travada viraria uma tarja.
    aspectRatio: 2.88,
    overflow: "hidden",
  },
  // 100% em vez de posicionamento absoluto: a <Image> do react-native-web
  // adota a medida do arquivo quando não recebe uma, e aí o `cover` acontece
  // dentro de uma caixa de 764px que a moldura apenas recorta — aparecia o
  // canto da foto em tamanho real, não a foto inteira.
  foto: {
    width: "100%",
    height: "100%",
  },
  faixa: {
    width: "100%",
    height: "100%",
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
  subtitulo: {
    ...typography.display,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 1,
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
