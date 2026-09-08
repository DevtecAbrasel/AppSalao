// Quanto antes do início de uma palestra favoritada o usuário deve ser
// avisado, em minutos. O valor escolhido vira o `minutesBefore` da
// Notification e faz parte da chave única, então cada limiar gera no máximo
// um aviso por usuário/evento.
//
// A varredura usa sempre o limiar MAIS ESPECÍFICO já vencido (o menor cujo
// tempo restante já é igual ou inferior). O TEXTO do aviso não sai daqui —
// é derivado do tempo que realmente falta (ver buildNotificationContent),
// senão uma palestra daqui a 5 horas cairia no limiar de 24h e seria
// anunciada como "amanhã".
export const REMINDER_OFFSETS_MINUTES = [24 * 60, 60, 15];
