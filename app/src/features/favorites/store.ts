import { create } from "zustand";
import { EventItem } from "../../types";
import { addFavorite, fetchFavorites, removeFavorite } from "./api";
import { useNotificationsStore } from "../notifications/store";

interface FavoritesState {
  favorites: EventItem[];
  favoriteIds: Set<string>;
  status: "idle" | "loading" | "error";
  error: string | null;
  load: () => Promise<void>;
  isFavorite: (eventId: string) => boolean;
  toggleFavorite: (event: EventItem) => Promise<void>;
  reset: () => void;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: [],
  favoriteIds: new Set(),
  status: "idle",
  error: null,

  load: async () => {
    set({ status: "loading", error: null });
    try {
      const favorites = await fetchFavorites();
      set({
        favorites,
        favoriteIds: new Set(favorites.map((e) => e.id)),
        status: "idle",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao carregar favoritos";
      set({ status: "error", error: message });
    }
  },

  isFavorite: (eventId: string) => get().favoriteIds.has(eventId),

  toggleFavorite: async (event: EventItem) => {
    const isCurrentlyFavorite = get().favoriteIds.has(event.id);

    // Otimista: atualiza a UI antes da resposta da API.
    const nextIds = new Set(get().favoriteIds);
    let nextFavorites: EventItem[];

    if (isCurrentlyFavorite) {
      nextIds.delete(event.id);
      nextFavorites = get().favorites.filter((e) => e.id !== event.id);
    } else {
      nextIds.add(event.id);
      nextFavorites = [...get().favorites, event];
    }

    set({ favoriteIds: nextIds, favorites: nextFavorites });

    // O aviso de "sua palestra está chegando" é criado pelo servidor a partir
    // do favorito (ver api/src/services/notifications.ts) — favoritar aqui não
    // agenda nada no device nem pede permissão de notificação.
    try {
      if (isCurrentlyFavorite) {
        await removeFavorite(event.id);
        // O servidor apaga os avisos desta palestra junto com o favorito;
        // refletimos isso no sininho na hora, sem esperar o próximo polling.
        useNotificationsStore.getState().dropForEvent(event.id);
      } else {
        await addFavorite(event.id);
      }
    } catch (err) {
      // Reverte a mudança otimista em caso de falha na API.
      set({
        error: err instanceof Error ? err.message : "Falha ao atualizar favorito",
      });
      await get().load();
    }
  },

  // Limpa o estado ao deslogar, pra não vazar favoritos da conta anterior.
  reset: () => set({ favorites: [], favoriteIds: new Set(), status: "idle", error: null }),
}));
