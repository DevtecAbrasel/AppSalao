import { useMemo, useState } from "react";
import { Pressable, SectionList, StyleSheet, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { Icon } from "../../components/Icon";
import { EmptyState } from "../../components/StateView";
import { normalizarTexto } from "../../lib/search";
import { EXPOSITORES, Expositor, temLocalizacao } from "./expositores";

// A lista vive fora do mapa, mas é dele que ela precisa. Tipamos só o destino
// usado aqui em vez de puxar o param list inteiro do root.
type NavegacaoParaMapa = {
  navigate: (tela: "Mapa", params: { screen: "MapView"; params: { focusExpositorKey: string } }) => void;
};

interface Secao {
  title: string;
  data: Expositor[];
}

// Agrupa por letra inicial. Com 72 nomes, a lista corrida vira uma parede —
// a letra dá ao dedo um ponto de referência enquanto rola.
function agrupar(lista: Expositor[]): Secao[] {
  const porLetra = new Map<string, Expositor[]>();
  for (const e of lista) {
    // A letra vem do nome JÁ normalizado, senão "Á" e "A" viram seções
    // separadas e os números caem em lugares imprevisíveis.
    const letra = normalizarTexto(e.nome).charAt(0).toUpperCase() || "#";
    const chave = /[A-Z]/.test(letra) ? letra : "#";
    const atual = porLetra.get(chave) ?? [];
    atual.push(e);
    porLetra.set(chave, atual);
  }
  return [...porLetra.entries()]
    .sort(([a], [b]) => (a === "#" ? -1 : b === "#" ? 1 : a.localeCompare(b)))
    .map(([title, data]) => ({ title, data }));
}

const ORDENADOS = [...EXPOSITORES].sort((a, b) =>
  normalizarTexto(a.nome).localeCompare(normalizarTexto(b.nome))
);

export function ExpositoresScreen() {
  const navigation = useNavigation<NavegacaoParaMapa>();
  const [busca, setBusca] = useState("");

  const secoes = useMemo(() => {
    const termo = normalizarTexto(busca);
    if (!termo) return agrupar(ORDENADOS);
    // Procura também pelo nome desenhado na planta: quem está no salão lê
    // "MACON" na parede e digita isso, não "Macom".
    const filtrados = ORDENADOS.filter(
      (e) =>
        normalizarTexto(e.nome).includes(termo) ||
        (e.nomeNaPlanta ? normalizarTexto(e.nomeNaPlanta).includes(termo) : false)
    );
    return agrupar(filtrados);
  }, [busca]);

  const totalFiltrado = secoes.reduce((s, sec) => s + sec.data.length, 0);

  const abrirNoMapa = (e: Expositor) => {
    if (!temLocalizacao(e)) return;
    navigation.navigate("Mapa", {
      screen: "MapView",
      params: { focusExpositorKey: e.key },
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.buscaWrapper}>
        <View style={styles.buscaIcone}>
          <Icon name="search" size={18} color={colors.textMuted} />
        </View>
        <TextInput
          style={styles.buscaInput}
          value={busca}
          onChangeText={setBusca}
          placeholder="Pesquisar expositor..."
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          accessibilityLabel="Pesquisar expositor"
        />
        {busca.length > 0 && (
          <Pressable
            onPress={() => setBusca("")}
            hitSlop={10}
            style={styles.buscaLimpar}
            accessibilityRole="button"
            accessibilityLabel="Limpar pesquisa"
          >
            <Icon name="close" size={16} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      <SectionList
        sections={secoes}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.lista}
        stickySectionHeadersEnabled
        keyboardShouldPersistTaps="handled"
        renderSectionHeader={({ section }) => (
          <Text style={styles.secaoTitulo}>{section.title}</Text>
        )}
        renderItem={({ item }) => {
          const localizavel = temLocalizacao(item);
          return (
            <Pressable
              style={[styles.item, !localizavel && styles.itemSemMapa]}
              onPress={() => abrirNoMapa(item)}
              disabled={!localizavel}
              accessibilityRole={localizavel ? "button" : undefined}
              accessibilityLabel={
                localizavel
                  ? `${item.nome}. Ver no mapa.`
                  : `${item.nome}. Sem localização no mapa.`
              }
            >
              <View style={styles.itemTexto}>
                <Text style={styles.itemNome}>{item.nome}</Text>
                {item.nomeNaPlanta && (
                  <Text style={styles.itemNaPlanta}>No mapa: {item.nomeNaPlanta}</Text>
                )}
              </View>
              {localizavel ? (
                <View style={styles.itemAcao}>
                  <Icon name="map" size={18} color={colors.primary} />
                  <Icon name="chevron-right" size={16} color={colors.primary} />
                </View>
              ) : (
                <Text style={styles.itemSemMapaTexto}>sem local</Text>
              )}
            </Pressable>
          );
        }}
        ListHeaderComponent={
          <Text style={styles.contagem}>
            {totalFiltrado} {totalFiltrado === 1 ? "expositor" : "expositores"}
          </Text>
        }
        ListEmptyComponent={
          <EmptyState message={`Nenhum expositor encontrado para "${busca}".`} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  buscaWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  buscaIcone: {
    alignItems: "center",
    justifyContent: "center",
  },
  buscaInput: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    fontSize: 15,
    color: colors.text,
  },
  buscaLimpar: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -spacing.xs,
  },
  lista: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  contagem: {
    ...typography.label,
    color: colors.textMuted,
    paddingVertical: spacing.sm,
  },
  secaoTitulo: {
    ...typography.label,
    fontSize: 12,
    color: colors.primary,
    backgroundColor: colors.background,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  // Sem stand no desenho: o item continua na lista (o expositor existe), mas
  // não finge ser tocável.
  itemSemMapa: {
    borderLeftColor: colors.border,
    backgroundColor: colors.surfaceCream,
  },
  itemTexto: {
    flex: 1,
  },
  itemNome: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.text,
  },
  itemNaPlanta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  itemAcao: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  itemSemMapaTexto: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
