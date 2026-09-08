import { prisma } from "../lib/prisma";
import { CATCH_UP_WINDOW_MINUTES, REMINDER_OFFSETS_MINUTES } from "../lib/reminderOffsets";

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

type ReminderEvent = { title: string; locationName: string; startTime: Date };
type ReminderOffset = (typeof REMINDER_OFFSETS_MINUTES)[number];

// Conteúdo exibido no sininho e no toast, sempre com os dados reais do
// evento. Para o aviso de 1 dia antes o horário sozinho seria ambíguo, então
// só nesse caso a data entra junto.
export function buildNotificationContent(offset: ReminderOffset, event: ReminderEvent) {
  const time = timeFormatter.format(event.startTime);
  const when =
    offset.minutesBefore >= 24 * 60 ? `${dateFormatter.format(event.startTime)} às ${time}` : time;

  return {
    title: offset.title,
    message: `Palestra: ${event.title}\nHorário: ${when}\nLocal: ${event.locationName}`,
  };
}

// Roda a cada minuto (ver index.ts): procura favoritos cujo evento está
// prestes a começar num dos intervalos de aviso e cria a notificação in-app.
// Cada combinação (usuário, evento, intervalo) só existe uma vez, garantido
// pela constraint única de Notification — é o próprio create que falha que
// impede o aviso repetido, sem precisar consultar antes.
export async function checkAndCreateEventReminders(): Promise<number> {
  const now = Date.now();
  let created = 0;

  const favorites = await prisma.userFavorite.findMany({
    include: { event: true },
  });

  for (const favorite of favorites) {
    const minutesUntilStart = (favorite.event.startTime.getTime() - now) / 60_000;
    if (minutesUntilStart <= 0) continue;

    for (const offset of REMINDER_OFFSETS_MINUTES) {
      const isDue =
        minutesUntilStart <= offset.minutesBefore &&
        minutesUntilStart > offset.minutesBefore - CATCH_UP_WINDOW_MINUTES;
      if (!isDue) continue;

      const content = buildNotificationContent(offset, favorite.event);

      try {
        await prisma.notification.create({
          data: {
            userId: favorite.userId,
            eventId: favorite.eventId,
            minutesBefore: offset.minutesBefore,
            type: "event_reminder",
            title: content.title,
            message: content.message,
          },
        });
        created++;
      } catch {
        continue; // já existia — nada a fazer
      }
    }
  }

  return created;
}
