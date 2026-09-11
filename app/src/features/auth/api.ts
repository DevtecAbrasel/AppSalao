import { api } from "../../lib/apiClient";

export type UserRole = "USER" | "ADMIN";

export interface AuthUser {
  id: string;
  email: string;
  /** Contas antigas em cache podem não ter o campo — tratar ausente como USER. */
  role?: UserRole;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export function register(email: string, password: string): Promise<AuthResponse> {
  return api.post<AuthResponse>("/auth/register", { email, password });
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return api.post<AuthResponse>("/auth/login", { email, password });
}

export function me(): Promise<AuthUser> {
  return api.get<AuthUser>("/auth/me");
}

/**
 * Troca a senha da conta daquele e-mail.
 *
 * Não devolve sessão: o fluxo termina na tela de login, com a pessoa entrando
 * com a senha nova. Quem valida o e-mail e grava o hash é o servidor — o app
 * não tem (nem deve ter) como mexer em senha.
 */
export function redefinirSenha(email: string, password: string): Promise<{ message: string }> {
  return api.post<{ message: string }>("/auth/reset-password", { email, password });
}
