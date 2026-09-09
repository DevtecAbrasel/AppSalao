import { EventItem, EventStatus } from "../types";

// A API sempre envia start_time/end_time como ISO 8601 com offset explícito
// (horário de Brasília, ex: "...T12:00:00-03:00"). `new Date(iso)` resolve
// para o instante absoluto correto independentemente do fuso do aparelho,
// então toda a matemática de contagem regressiva abaixo é feita em UTC puro
// — sem depender do timezone local do device.
export function getEventStatus(event: Pick<EventItem, "startTime" | "endTime">, now = new Date()): EventStatus {
  const start = new Date(event.startTime).getTime();
  const end = new Date(event.endTime).getTime();
  const current = now.getTime();

  if (Number.isNaN(start)) return "upcoming";

  if (current < start) return "upcoming";

  // Sem término válido não dá para afirmar que acabou. Uma palestra em
  // andamento é o palpite seguro: marcá-la como finalizada esconderia da
  // agenda e bloquearia o favorito de algo que talvez esteja acontecendo.
  if (Number.isNaN(end)) return "live";

  return current <= end ? "live" : "ended";
}

export function msUntil(isoDate: string, now = new Date()): number {
  return new Date(isoDate).getTime() - now.getTime();
}

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
}

export function toCountdown(totalMs: number): Countdown {
  const clamped = Math.max(totalMs, 0);
  const totalSeconds = Math.floor(clamped / 1000);

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalMs: clamped,
  };
}

export function formatCountdown(c: Countdown): string {
  if (c.days > 0) return `${c.days}d ${pad(c.hours)}h ${pad(c.minutes)}m`;
  if (c.hours > 0) return `${pad(c.hours)}h ${pad(c.minutes)}m ${pad(c.seconds)}s`;
  return `${pad(c.minutes)}m ${pad(c.seconds)}s`;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  weekday: "short",
  day: "2-digit",
  month: "short",
});

// Sempre exibir horário no fuso do evento (Brasília), não no fuso do device.
export function formatEventTime(isoDate: string): string {
  return timeFormatter.format(new Date(isoDate));
}

export function formatEventDate(isoDate: string): string {
  return dateFormatter.format(new Date(isoDate));
}
