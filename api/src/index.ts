import express from "express";
import cors from "cors";
import morgan from "morgan";
import { env } from "./env";
import { healthRouter } from "./routes/health";
import { eventsRouter } from "./routes/events";
import { favoritesRouter } from "./routes/favorites";
import { authRouter } from "./routes/auth";
import { notificationsRouter } from "./routes/notifications";
import { usersRouter } from "./routes/users";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { checkAndCreateEventReminders } from "./services/notifications";

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use(healthRouter);
app.use(eventsRouter);
app.use(favoritesRouter);
app.use(authRouter);
app.use(notificationsRouter);
app.use(usersRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`API Salão Abrasel rodando na porta ${env.PORT}`);
});

// Varredura periódica que cria as notificações in-app dos favoritos cujo
// horário está chegando. Best-effort: uma falha aqui nunca deve derrubar a
// API — na pior das hipóteses o aviso sai no minuto seguinte (a janela de
// catch-up em reminderOffsets.ts existe justamente pra isso).
setInterval(() => {
  checkAndCreateEventReminders().catch((err) => {
    console.warn("Falha ao checar lembretes de eventos:", err);
  });
}, 60_000);
