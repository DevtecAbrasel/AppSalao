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
  MapView:
    | { focusEventId?: string; focusExpositorKey?: string; focusPoiKey?: string }
    | undefined;
  EventDetail: { eventId: string };
  Notifications: undefined;
};

// Lista de expositores: aba própria porque é um destino em si ("onde fica a
// Ambev?"), e não um detalhe de outra tela. Daqui se salta para o mapa.
export type ExhibitorsStackParamList = {
  ExhibitorsList: undefined;
};

// Plantão de consultorias no estande da Abrasel. Uma tela só, mas com aba
// própria: é uma oferta que vale durante os dois dias inteiros e alguém pode
// querer voltar nela a qualquer momento.
export type ConsultingStackParamList = {
  ConsultingHome: undefined;
};

// Painel administrativo: separado da experiência normal do app, numa aba
// própria que só existe para contas com papel ADMIN.
export type AdminStackParamList = {
  AdminHome: undefined;
  AdminEvents: undefined;
  AdminEventForm: { eventId?: string };
  AdminUsers: undefined;
};

export type RootTabParamList = {
  Agenda: NavigatorScreenParams<AgendaStackParamList>;
  Favoritos: NavigatorScreenParams<FavoritesStackParamList>;
  Mapa: NavigatorScreenParams<MapStackParamList>;
  Expositores: NavigatorScreenParams<ExhibitorsStackParamList>;
  Consultorias: NavigatorScreenParams<ConsultingStackParamList>;
  Admin: NavigatorScreenParams<AdminStackParamList>;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootTabParamList {}
  }
}
