import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, spacing } from "../../constants/theme";
import { useNotificationsStore } from "./store";

// Quanto tempo o banner fica na tela antes de sumir sozinho.
const AUTO_DISMISS_MS = 6000;

interface Props {
  /** Abre a palestra da notificação. Recebe o id do evento. */
  onOpenEvent: (eventId: string) => void;
}

// Banner discreto no topo, sobreposto à navegação: aparece quando o polling
// traz uma notificação nova com o app aberto. Não bloqueia nada — é só uma
// camada por cima, sem modal e sem interromper a tela atual.
export function NotificationToast({ onOpenEvent }: Props) {
  const insets = useSafeAreaInsets();
  const toast = useNotificationsStore((s) => s.toast);
  const dismissToast = useNotificationsStore((s) => s.dismissToast);
  const markAsRead = useNotificationsStore((s) => s.markAsRead);

  const translateY = useRef(new Animated.Value(-160)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast) return;

    translateY.setValue(-160);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 9, tension: 70 }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => dismissToast(), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast, translateY, opacity, dismissToast]);

  if (!toast) return null;

  const handlePress = () => {
    markAsRead(toast.id);
    dismissToast();
    if (toast.event) onOpenEvent(toast.event.id);
  };

  return (
    <Animated.View
      // pointerEvents="box-none" no wrapper: só o card recebe toque, o resto
      // da área continua clicável pela tela que está por baixo.
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        { top: insets.top + spacing.sm, transform: [{ translateY }], opacity },
      ]}
    >
      {/* O "dispensar" é irmão do corpo, não filho: um Pressable dentro do
          outro vira <button> aninhado na web (HTML inválido). */}
      <View style={styles.card}>
        <Pressable
          style={styles.content}
          onPress={handlePress}
          accessibilityRole="button"
          accessibilityLabel={`${toast.title}. ${toast.message}. Toque para ver a palestra.`}
        >
          <Text style={styles.title} numberOfLines={1}>
            {toast.title}
          </Text>
          <Text style={styles.message} numberOfLines={3}>
            {toast.message}
          </Text>
        </Pressable>

        <Pressable
          onPress={dismissToast}
          hitSlop={10}
          style={styles.close}
          accessibilityRole="button"
          accessibilityLabel="Dispensar aviso"
        >
          <Text style={styles.closeIcon}>✕</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    zIndex: 100,
    elevation: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    padding: spacing.md,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  message: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
  },
  close: {
    marginLeft: spacing.sm,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  closeIcon: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
