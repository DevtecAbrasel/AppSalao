import { NavigatorScreenParams } from "@react-navigation/native";

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

// `Notifications` é registrada em TODOS os stacks que exibem o cabeçalho, de
// propósito: o sino mora lá, e sem a rota local o React Navigation resolveria
// subindo até outro navegador — abriria a tela certa, mas trocando a aba por
// baixo de quem tocou. Assim a tela empilha onde a pessoa já estava, e o
// "voltar" devolve ao lugar de origem.
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
  Notifications: undefined;
};

// Atrações: a lista é a tela da aba, e "Atracao" é a página de qualquer uma
// delas — uma rota só, com a chave da atração como parâmetro.
export type AttractionsStackParamList = {
  AtracoesList: undefined;
  Atracao: { atracaoKey: string };
  Notifications: undefined;
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
  Atracoes: NavigatorScreenParams<AttractionsStackParamList>;
  Admin: NavigatorScreenParams<AdminStackParamList>;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootTabParamList {}
  }
}
