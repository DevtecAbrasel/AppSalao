import { getEventStatus, msUntil, toCountdown } from "../../lib/dateTime";
import { EventItem, EventStatus } from "../../types";
import { useNow } from "./useNow";

export interface CountdownState {
  status: EventStatus;
  countdown: ReturnType<typeof toCountdown>;
}

export function useCountdown(event: Pick<EventItem, "startTime" | "endTime">): CountdownState {
  // 1s porque a pill mostra segundos; as listas usam useNow(30s) direto.
  const now = useNow(1000);

  const status = getEventStatus(event, now);
  const target = status === "upcoming" ? event.startTime : event.endTime;

  return {
    status,
    countdown: toCountdown(msUntil(target, now)),
  };
}
