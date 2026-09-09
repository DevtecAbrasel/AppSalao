import { useEffect, useState } from "react";

// Relógio que avança sozinho, para que a interface reaja à passagem do horário
// sem o usuário precisar fechar e abrir o app.
//
// As listas usam um intervalo folgado (30s): o que muda nelas é só o status da
// palestra, e errar por meio minuto no instante em que ela vira "Finalizada"
// não é perceptível. A contagem regressiva do card, essa sim, precisa de 1s —
// é ela quem exibe os segundos (ver useCountdown).
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
