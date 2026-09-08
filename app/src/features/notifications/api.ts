import { api } from "../../lib/apiClient";
import { EventItem } from "../../types";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  /** ISO 8601, ou null enquanto não lida. */
  readAt: string | null;
  createdAt: string;
  /** Palestra relacionada — sempre presente para lembretes de evento. */
  event: EventItem | null;
}

export interface NotificationsResponse {
  unreadCount: number;
  notifications: NotificationItem[];
}

export function fetchNotifications(): Promise<NotificationsResponse> {
  return api.get<NotificationsResponse>("/notifications");
}

export function markNotificationRead(id: string): Promise<{ unreadCount: number }> {
  return api.post<{ unreadCount: number }>(`/notifications/${id}/read`, {});
}

export function markAllNotificationsRead(): Promise<{ unreadCount: number }> {
  return api.post<{ unreadCount: number }>("/notifications/read-all", {});
}
