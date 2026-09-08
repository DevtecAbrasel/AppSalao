import { Alert, Platform } from "react-native";

// `Alert` do react-native-web é um no-op (`static alert() {}`), então uma
// confirmação feita direto com ele nunca aparece na web — e, pior, o callback
// de confirmação nunca roda, deixando o botão mudo em vez de dar erro.
// Estes dois helpers escolhem o diálogo nativo do sistema no mobile e o do
// navegador na web, para que confirmar/avisar funcionem nos dois lugares.

interface ConfirmOptions {
  title: string;
  message: string;
  /** Texto do botão que confirma. O de cancelar é sempre "Cancelar". */
  confirmLabel: string;
  /** Ações destrutivas ganham o estilo vermelho do iOS. */
  destructive?: boolean;
  onConfirm: () => void;
}

export function confirmar({
  title,
  message,
  confirmLabel,
  destructive = false,
  onConfirm,
}: ConfirmOptions): void {
  if (Platform.OS === "web") {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }

  Alert.alert(title, message, [
    { text: "Cancelar", style: "cancel" },
    { text: confirmLabel, style: destructive ? "destructive" : "default", onPress: onConfirm },
  ]);
}

export function avisar(title: string, message: string): void {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
    return;
  }

  Alert.alert(title, message);
}
