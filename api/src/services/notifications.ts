import { prisma } from "../lib/prisma";
import { REMINDER_OFFSETS_MINUTES } from "../lib/reminderOffsets";

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

const dayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });

function mesmoDiaEmBrasilia(a: Date, b: Date): boolean {
  return dayFormatter.format(a) === dayFormatter.format(b);
}

// Conteúdo exibido no sininho e no toast, sempre com os dados reais do
// evento. O título vem do tempo que REALMENTE falta, não do limiar que
// disparou: com a regra do "limiar mais específico", uma palestra daqui a 5
// horas cai no limiar de 24h, e chamá-la de "amanhã" seria mentira.
//
// A data só entra no horário quando a palestra é em outro dia — no mesmo dia
// "Horário: 14:00" basta e fica mais limpo.
export function buildNotificationContent(
  offset: number,
  event: ReminderEvent,
  now: Date = new Date()
) {
  const noMesmoDia = mesmoDiaEmBrasilia(event.startTime, now);
  const time = timeFormatter.format(event.startTime);
  const when = noMesmoDia ? time : `${dateFormatter.format(event.startTime)} às ${time}`;

  // Sem emoji no título: o app usa ícones vetoriais e o sino já sinaliza que
  // aquilo é um aviso, então o relógio/calendário só repetia o contexto com um
  // desenho que muda de forma em cada sistema.
  const title =
    offset >= 24 * 60
      ? noMesmoDia
        ? "Sua palestra é hoje!"
        : "Amanhã tem palestra!"
      : "Sua palestra está chegando!";

  return {
    title,
    message: `Palestra: ${event.title}\nHorário: ${when}\nLocal: ${event.locationName}`,
  };
}

// O aviso mais específico já vencido: entre os intervalos cujo limiar a
// palestra já cruzou, o de menor `minutesBefore`.
//
// É isso que faz "favoritei agora uma palestra que começa em 10 minutos"
// avisar na hora — e avisar UMA vez, com o texto certo ("está chegando"), em
// vez de despejar de uma só vez os três avisos cujos limiares já passaram.
// Também cobre o servidor ter ficado fora do ar: ao voltar, ele manda o aviso
// correspondente ao tempo que REALMENTE falta, não um "amanhã tem" atrasado.
export function mostSpecificDueOffset(minutesUntilStart: number): number | null {
  const vencidos = REMINDER_OFFSETS_MINUTES.filter((offset) => minutesUntilStart <= offset);
  return vencidos.length === 0 ? null : Math.min(...vencidos);
}

// Roda a cada minuto (ver index.ts): procura favoritos cujo evento já entrou
// num intervalo de aviso e cria a notificação in-app. Cada combinação
// (usuário, evento, intervalo) só existe uma vez, garantido pela constraint
// única de Notification — é o próprio create que falha que impede o aviso
// repetido, sem precisar consultar antes.
export async function checkAndCreateEventReminders(): Promise<number> {
  const now = Date.now();
  let created = 0;

  const favorites = await prisma.userFavorite.findMany({
    include: { event: true },
  });

  for (const favorite of favorites) {
    const minutesUntilStart = (favorite.event.startTime.getTime() - now) / 60_000;
    if (minutesUntilStart <= 0) continue;

    const offset = mostSpecificDueOffset(minutesUntilStart);
    if (offset === null) continue; // ainda longe demais

    const content = buildNotificationContent(offset, favorite.event, new Date(now));

    try {
      await prisma.notification.create({
        data: {
          userId: favorite.userId,
          eventId: favorite.eventId,
          minutesBefore: offset,
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

  return created;
}
