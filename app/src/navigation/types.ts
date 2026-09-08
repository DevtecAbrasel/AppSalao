import { NavigatorScreenParams } from "@react-navigation/native";

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

// `Notifications` é registrada nos três stacks de propósito: assim o sino
// abre a lista dentro da aba onde o usuário já está, sem pular de aba, e a
// palestra aberta a partir de uma notificação empilha no mesmo lugar.
export type AgendaStackParamList = {
  AgendaList: undefined;
  EventDetail: { eventId: string };
  Notifications: undefined;
};

export type FavoritesStackParamList = {
  FavoritesList: undefined;
  EventDetail: { eventId: string };
  Notifications: undefined;
};

export type MapStackParamList = {
  MapView: { focusEventId?: string } | undefined;
  EventDetail: { eventId: string };
  Notifications: undefined;
};

export type RootTabParamList = {
  Agenda: NavigatorScreenParams<AgendaStackParamList>;
  Favoritos: NavigatorScreenParams<FavoritesStackParamList>;
  Mapa: NavigatorScreenParams<MapStackParamList>;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootTabParamList {}
  }
}
