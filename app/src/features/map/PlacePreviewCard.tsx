import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../constants/theme";
import { Icon } from "../../components/Icon";

interface Props {
  label: string;
  onClose: () => void;
}

// Preview simples pra estandes/ativações sem programação com horário — só
// o nome do local, diferente do EventPreviewCard (que mostra contagem
// regressiva e liga pro detalhe de uma palestra).
export function PlacePreviewCard({ label, onClose }: Props) {
  return (
    <View style={styles.card}>
      <Pressable
        style={styles.closeButton}
        onPress={onClose}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Fechar"
      >
        <Icon name="close" size={18} color={colors.textMuted} />
      </Pressable>

      <Text style={styles.eyebrow}>Estande / Ativação</Text>
      <Text style={styles.title}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  closeButton: {
    position: "absolute",
    top: spacing.xs,
    right: spacing.xs,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  eyebrow: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginTop: 2,
    paddingRight: spacing.lg,
  },
});
