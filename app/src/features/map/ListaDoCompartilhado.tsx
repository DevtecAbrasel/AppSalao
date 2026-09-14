import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../../constants/theme";
import { emColunas, ITENS_POR_COLUNA } from "./estandesCompartilhados";

interface Props {
  expositores: string[];
}

// A lista de quem divide um estande compartilhado, em colunas de 4.
//
// As colunas têm a mesma largura (`flex: 1`) e o número delas sai da própria
// lista: 16 nomes viram 4 colunas, 8 viram 2. Assim o mesmo componente serve
// os dois estandes sem receber configuração nenhuma.
//
// A numeração é contínua (1..16) e não reinicia a cada coluna: é como a
// organização enviou, e é o que permite conferir a lista contra o impresso
// sem contar nos dedos.
export function ListaDoCompartilhado({ expositores }: Props) {
  const colunas = emColunas(expositores);

  return (
    <View style={styles.colunas}>
      {colunas.map((coluna, iColuna) => (
        <View key={iColuna} style={styles.coluna}>
          {coluna.map((nome, iItem) => {
            const numero = iColuna * ITENS_POR_COLUNA + iItem + 1;
            return (
              // A chave leva o índice de propósito: há três "Moncoc" na mesma
              // lista, e o nome sozinho não identifica a linha.
              <View key={`${numero}-${nome}`} style={styles.item}>
                <Text style={styles.numero}>{numero}</Text>
                <Text style={styles.nome}>{nome}</Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  colunas: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  coluna: {
    flex: 1,
    gap: spacing.xs + 2,
  },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
  },
  numero: {
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "700",
    color: colors.textMuted,
    // Largura fixa para os nomes alinharem entre si mesmo com número de dois
    // dígitos; `tabular-nums` mantém o 1 com a mesma largura do 8.
    minWidth: 13,
    fontVariant: ["tabular-nums"],
  },
  nome: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 15,
    color: colors.text,
  },
});
