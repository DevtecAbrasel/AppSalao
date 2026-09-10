import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "../constants/theme";
import { Icon, IconName } from "../components/Icon";

interface Props {
  icon: IconName;
  /** Palavra sob o ícone. Curta: o cabeçalho divide a largura com o título. */
  label: string;
  onPress: () => void;
  accessibilityLabel: string;
  color?: string;
  /** Sobreposto ao ícone — usado pelo contador do sino. */
  badge?: ReactNode;
}

// Forma única das ações do cabeçalho: ícone com a palavra embaixo.
//
// Sozinho, um glifo é adivinhação — um balão pode ser conversa, suporte ou
// mensagem. O rótulo resolve isso de uma vez, e é o mesmo arranjo que a barra
// de abas já usa, então o app inteiro passa a explicar seus ícones do mesmo
// jeito.
export function HeaderAction({
  icon,
  label,
  onPress,
  accessibilityLabel,
  color = colors.textMuted,
  badge,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={styles.botao}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <View>
        <Icon name={icon} size={20} color={color} />
        {badge}
      </View>
      <Text style={[styles.rotulo, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  botao: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
    minWidth: 44,
  },
  rotulo: {
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: "700",
    marginTop: 1,
  },
});
