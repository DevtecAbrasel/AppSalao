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
 * Pede o e-mail com o link de recuperação.
 *
 * A resposta é a mesma exista ou não a conta — é assim de propósito no
 * servidor, para que ninguém use esta rota como lista de quem tem conta. A
 * tela mostra a mensagem que vier.
 */
export function forgotPassword(email: string): Promise<{ message: string }> {
  return api.post<{ message: string }>("/auth/forgot-password", { email });
}

/** Troca a senha com o token do link e já devolve a sessão. */
export function resetPassword(token: string, password: string): Promise<AuthResponse> {
  return api.post<AuthResponse>("/auth/reset-password", { token, password });
}
