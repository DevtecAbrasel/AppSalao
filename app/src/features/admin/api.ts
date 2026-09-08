import { api } from "../../lib/apiClient";
import { EventItem } from "../../types";
import { UserRole } from "../auth/api";

export interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  favoritesCount: number;
  /** O próprio admin logado — o servidor recusa excluir a si mesmo. */
  isSelf: boolean;
}

// Campos aceitos por POST/PUT /events. Datas em ISO 8601 com offset de
// Brasília, no mesmo formato que a API já devolve.
export interface EventPayload {
  title: string;
  description: string;
  speaker: string | null;
  locationName: string;
  locationMapX: number | null;
  locationMapY: number | null;
  startTime: string;
  endTime: string;
  category: string | null;
}

export function fetchAdminUsers(): Promise<AdminUser[]> {
  return api.get<AdminUser[]>("/admin/users");
}

export function deleteUser(id: string): Promise<void> {
  return api.delete(`/admin/users/${id}`);
}

export function createEvent(payload: EventPayload): Promise<EventItem> {
  return api.post<EventItem>("/events", payload);
}

export function updateEvent(id: string, payload: EventPayload): Promise<EventItem> {
  return api.put<EventItem>(`/events/${id}`, payload);
}

export function deleteEvent(id: string): Promise<void> {
  return api.delete(`/events/${id}`);
}
