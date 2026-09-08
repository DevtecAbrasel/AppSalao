// Quanto antes do início de uma palestra favoritada o usuário deve ser
// avisado. Esta é a MESMA lógica que existia para os lembretes por e-mail —
// só o efeito mudou (antes: enviar e-mail; agora: criar uma notificação
// in-app). `minutesBefore` faz parte da chave única de Notification, então
// cada linha aqui gera no máximo um aviso por usuário/evento.
export const REMINDER_OFFSETS_MINUTES = [
  { minutesBefore: 24 * 60, label: "Amanhã tem", title: "📅 Amanhã tem palestra!" },
  { minutesBefore: 60, label: "Daqui a 1 hora", title: "⏰ Sua palestra está chegando!" },
  { minutesBefore: 15, label: "Daqui a 15 minutos", title: "⏰ Sua palestra está chegando!" },
];

// Se o servidor ficar fora do ar e perder o instante exato de um aviso, ainda
// dá pra criar com atraso dentro dessa janela; passado isso, esse aviso em
// específico é considerado perdido (não aparece mais tarde, fora de contexto).
export const CATCH_UP_WINDOW_MINUTES = 5;
