import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { Icon, IconName } from "../../components/Icon";
import { useInstalarApp } from "./useInstalarApp";

// Convite para deixar o app na tela inicial. Só aparece quando há de fato um
// caminho a oferecer: some depois de instalado e em navegador que não instala.
export function InstallAppButton() {
  const { modo, instalar } = useInstalarApp();
  const [aberto, setAberto] = useState(false);

  if (modo === "nenhum") return null;

  const aoInstalar = async () => {
    const aceitou = await instalar();
    if (aceitou) setAberto(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setAberto(true)}
        hitSlop={8}
        style={styles.botaoHeader}
        accessibilityRole="button"
        accessibilityLabel="Instalar o app na tela inicial"
      >
        <Icon name="download" size={21} color={colors.textMuted} />
      </Pressable>

      <Modal
        visible={aberto}
        transparent
        animationType="fade"
        onRequestClose={() => setAberto(false)}
      >
        <Pressable style={styles.fundo} onPress={() => setAberto(false)}>
          {/* Pressable interno sem onPress: absorve o toque para que clicar
              dentro do cartão não feche o modal. */}
          <Pressable style={styles.cartao} onPress={() => {}}>
            <View style={styles.cabecalho}>
              <View style={styles.marca}>
                <Icon name="download" size={22} color={colors.primary} />
              </View>
              <Pressable
                onPress={() => setAberto(false)}
                hitSlop={10}
                style={styles.fechar}
                accessibilityRole="button"
                accessibilityLabel="Fechar"
              >
                <Icon name="close" size={18} color={colors.textMuted} />
              </Pressable>
            </View>

            <Text style={styles.eyebrow}>Salão Abrasel · 2026</Text>
            <Text style={styles.titulo}>Deixe o app na tela inicial</Text>
            <Text style={styles.subtitulo}>
              Fica com ícone junto dos seus outros aplicativos e abre em tela
              cheia, sem a barra do navegador. Não ocupa espaço como um app
              baixado da loja.
            </Text>

            {modo === "prompt" ? (
              <Pressable
                style={styles.botaoPrincipal}
                onPress={aoInstalar}
                accessibilityRole="button"
              >
                <Text style={styles.botaoPrincipalTexto}>Instalar agora</Text>
              </Pressable>
            ) : (
              <View style={styles.passos}>
                <Passo
                  numero={1}
                  icone="share-ios"
                  texto="Toque em Compartilhar, na barra do Safari."
                />
                <Passo
                  numero={2}
                  icone="add-box"
                  texto="Role a lista e escolha Adicionar à Tela de Início."
                />
                <Passo
                  numero={3}
                  icone="download"
                  texto="Confirme em Adicionar. O ícone aparece na tela inicial."
                />
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function Passo({ numero, icone, texto }: { numero: number; icone: IconName; texto: string }) {
  return (
    <View style={styles.passo}>
      <View style={styles.passoNumero}>
        <Text style={styles.passoNumeroTexto}>{numero}</Text>
      </View>
      <Icon name={icone} size={20} color={colors.marinho} />
      <Text style={styles.passoTexto}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  botaoHeader: {
    paddingHorizontal: spacing.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  fundo: {
    flex: 1,
    backgroundColor: "rgba(21, 36, 60, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  cartao: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  cabecalho: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  marca: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceCream,
    alignItems: "center",
    justifyContent: "center",
  },
  fechar: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -spacing.xs,
    marginTop: -spacing.xs,
  },
  eyebrow: {
    ...typography.label,
    color: colors.primary,
  },
  titulo: {
    fontSize: 21,
    fontWeight: "800",
    color: colors.text,
    marginTop: spacing.xs,
  },
  subtitulo: {
    fontSize: 14.5,
    lineHeight: 21,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  botaoPrincipal: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm + 4,
    alignItems: "center",
    marginTop: spacing.lg,
  },
  botaoPrincipalTexto: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  passos: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  passo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  passoNumero: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    backgroundColor: colors.marinho,
    alignItems: "center",
    justifyContent: "center",
  },
  passoNumeroTexto: {
    color: colors.textOnDark,
    fontSize: 12,
    fontWeight: "700",
  },
  passoTexto: {
    flex: 1,
    fontSize: 14.5,
    lineHeight: 20,
    color: colors.text,
  },
});
