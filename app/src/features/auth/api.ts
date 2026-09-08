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
