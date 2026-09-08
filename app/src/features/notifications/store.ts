import { AppState, AppStateStatus, NativeEventSubscription } from "react-native";
import { create } from "zustand";
import {
  NotificationItem,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./api";

// De quanto em quanto tempo o app pergunta à API se há notificação nova. O
// servidor varre os favoritos a cada minuto, então checar no mesmo ritmo já
// entrega o aviso quase na hora — sem WebSocket, sem push.
const POLL_INTERVAL_MS = 60_000;

interface NotificationsState {
  items: NotificationItem[];
  unreadCount: number;
  status: "idle" | "loading" | "error";
  error: string | null;
  /** Notificação que o toast está exibindo agora (null = nenhum toast). */
  toast: NotificationItem | null;
  load: (options?: { silent?: boolean }) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissToast: () => void;
  /** Remove localmente os avisos de uma palestra que deixou de ser favorita. */
  dropForEvent: (eventId: string) => void;
  startPolling: () => void;
  stopPolling: () => void;
  reset: () => void;
}

// Estado de controle do polling fica fora do store: não é UI, ninguém
// re-renderiza por causa dele.
let pollTimer: ReturnType<typeof setInterval> | null = null;
let appStateSubscription: NativeEventSubscription | null = null;

// Ids já vistos por ESTA sessão do app. Serve só para decidir o que é
// "novidade" digna de toast — o que é lido/não lido continua sendo o
// `readAt` do banco, que é a fonte da verdade do badge.
let seenIds = new Set<string>();
let hasSeededSeenIds = false;

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  items: [],
  unreadCount: 0,
  status: "idle",
  error: null,
  toast: null,

  // `silent` é o modo do polling: atualiza sem piscar spinner na tela.
  load: async ({ silent = false } = {}) => {
    if (!silent) set({ status: "loading", error: null });

    try {
      const { notifications, unreadCount } = await fetchNotifications();

      // Na primeira carga só memorizamos o que já existe: senão, abrir o app
      // com avisos antigos acumulados dispararia uma fila de toasts.
      if (!hasSeededSeenIds) {
        seenIds = new Set(notifications.map((n) => n.id));
        hasSeededSeenIds = true;
        set({ items: notifications, unreadCount, status: "idle", error: null });
        return;
      }

      // Chegou algo que não estava aqui antes e ainda não foi lido → toast.
      // Se vierem várias de uma vez, mostramos a mais recente (a lista vem
      // ordenada por createdAt desc) e as demais ficam no sininho.
      const fresh = notifications.find((n) => !seenIds.has(n.id) && n.readAt === null);
      for (const n of notifications) seenIds.add(n.id);

      set({
        items: notifications,
        unreadCount,
        status: "idle",
        error: null,
        toast: fresh ?? get().toast,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao carregar notificações";
      // Falha de rede no polling não deve apagar o que já está na tela nem
      // mostrar erro por cima de uma lista que ainda é válida.
      if (silent) return;
      set({ status: "error", error: message });
    }
  },

  markAsRead: async (id: string) => {
    const target = get().items.find((n) => n.id === id);
    if (!target || target.readAt !== null) return;

    // Otimista, no mesmo espírito do toggleFavorite: o badge reage na hora.
    const readAt = new Date().toISOString();
    set({
      items: get().items.map((n) => (n.id === id ? { ...n, readAt } : n)),
      unreadCount: Math.max(0, get().unreadCount - 1),
      toast: get().toast?.id === id ? null : get().toast,
    });

    try {
      const { unreadCount } = await markNotificationRead(id);
      set({ unreadCount });
    } catch {
      // Recarrega para reconciliar com o servidor em vez de adivinhar.
      await get().load({ silent: true });
    }
  },

  markAllAsRead: async () => {
    const readAt = new Date().toISOString();
    set({
      items: get().items.map((n) => (n.readAt ? n : { ...n, readAt })),
      unreadCount: 0,
      toast: null,
    });

    try {
      await markAllNotificationsRead();
    } catch {
      await get().load({ silent: true });
    }
  },

  dismissToast: () => set({ toast: null }),

  // Espelha o que o servidor faz ao desfavoritar (DELETE /favorites também
  // apaga as notificações da palestra). Aplicamos na hora pra o sininho não
  // ficar mostrando um aviso que já não existe até o próximo polling.
  //
  // Os ids removidos saem de `seenIds`: se a palestra for favoritada de novo
  // e o servidor recriar o aviso, ele volta a contar como novidade e o toast
  // aparece — em vez de ser silenciosamente engolido por já ter sido visto.
  dropForEvent: (eventId: string) => {
    const restantes = get().items.filter((n) => n.event?.id !== eventId);
    for (const n of get().items) {
      if (n.event?.id === eventId) seenIds.delete(n.id);
    }

    set({
      items: restantes,
      unreadCount: restantes.filter((n) => n.readAt === null).length,
      toast: get().toast?.event?.id === eventId ? null : get().toast,
    });
  },

  startPolling: () => {
    if (pollTimer) return; // já rodando

    get().load();
    pollTimer = setInterval(() => {
      get().load({ silent: true });
    }, POLL_INTERVAL_MS);

    // Voltando do background o timer pode ter ficado parado (ou muito
    // atrasado): buscar na hora evita o sininho desatualizado logo na volta.
    appStateSubscription = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "active") get().load({ silent: true });
    });
  },

  stopPolling: () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    appStateSubscription?.remove();
    appStateSubscription = null;
  },

  // Chamado ao deslogar, pra não vazar notificação de uma conta pra outra.
  reset: () => {
    seenIds = new Set();
    hasSeededSeenIds = false;
    set({ items: [], unreadCount: 0, status: "idle", error: null, toast: null });
  },
}));
