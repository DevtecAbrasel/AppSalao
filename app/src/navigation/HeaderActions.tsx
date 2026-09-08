import { View } from "react-native";
import { NotificationBell } from "../features/notifications/NotificationBell";
import { LogoutButton } from "../features/auth/LogoutButton";
import { spacing } from "../constants/theme";

// Ações fixas do cabeçalho, iguais nas três abas. Antes o "Sair" existia só
// no header de Favoritos: quem estivesse na Agenda ou no Mapa simplesmente não
// tinha como encerrar a sessão sem descobrir que ele morava em outra aba.
export function HeaderActions() {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
      <NotificationBell />
      <LogoutButton />
    </View>
  );
}
