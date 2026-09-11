import { create } from "zustand";
import { deleteSecureItem, getSecureItem, setSecureItem } from "../../lib/secureStorage";
import { setAuthToken, setUnauthorizedHandler } from "../../lib/authToken";
import { useFavoritesStore } from "../favorites/store";
import { AuthUser, login as apiLogin, register as apiRegister } from "./api";

const TOKEN_KEY = "salao-abrasel-auth-token";
const USER_KEY = "salao-abrasel-auth-user";

type AuthStatus = "hydrating" | "unauthenticated" | "authenticated";

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  error: string | null;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

async function persistSession(token: string, user: AuthUser): Promise<void> {
  setAuthToken(token);
  await setSecureItem(TOKEN_KEY, token);
  await setSecureItem(USER_KEY, JSON.stringify(user));
}

async function clearSession(): Promise<void> {
  setAuthToken(null);
  await deleteSecureItem(TOKEN_KEY);
  await deleteSecureItem(USER_KEY);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "hydrating",
  user: null,
  error: null,

  // Só lê a sessão salva localmente, sem round-trip de rede — no local do
  // evento o Wi-Fi pode estar instável, então confiamos no token guardado e
  // só forçamos logout se uma chamada de verdade retornar 401 depois.
  hydrate: async () => {
    try {
      const [token, userRaw] = await Promise.all([
        getSecureItem(TOKEN_KEY),
        getSecureItem(USER_KEY),
      ]);

      if (token && userRaw) {
        setAuthToken(token);
        set({ status: "authenticated", user: JSON.parse(userRaw) as AuthUser });
        useFavoritesStore.getState().load();
      } else {
        set({ status: "unauthenticated" });
      }
    } catch {
      set({ status: "unauthenticated" });
    }
  },

  login: async (email: string, password: string) => {
    set({ error: null });
    try {
      const { token, user } = await apiLogin(email, password);
      await persistSession(token, user);
      set({ status: "authenticated", user });
      useFavoritesStore.getState().load();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Falha ao entrar" });
      throw err;
    }
  },

  register: async (email: string, password: string) => {
    set({ error: null });
    try {
      const { token, user } = await apiRegister(email, password);
      await persistSession(token, user);
      set({ status: "authenticated", user });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Falha ao criar conta" });
      throw err;
    }
  },

  // A redefinição de senha não passa por aqui de propósito: ela não abre
  // sessão nem mexe no estado de autenticação — termina na tela de login,
  // com a pessoa entrando com a senha nova. A chamada mora na própria tela.

  logout: async () => {
    await clearSession();
    useFavoritesStore.getState().reset();
    set({ status: "unauthenticated", user: null, error: null });
  },
}));

// Se qualquer chamada à API voltar 401 (token expirado/inválido), desloga.
setUnauthorizedHandler(() => {
  useAuthStore.getState().logout();
});
