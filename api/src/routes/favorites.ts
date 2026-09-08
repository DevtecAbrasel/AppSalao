import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { ApiError } from "../lib/ApiError";
import { requireAuth } from "../middleware/auth";
import { favoriteBodySchema } from "../schemas/favorite";

export const favoritesRouter = Router();

favoritesRouter.post(
  "/favorites",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { event_id } = favoriteBodySchema.parse(req.body);

    const event = await prisma.event.findUnique({ where: { id: event_id } });
    if (!event) {
      throw ApiError.notFound("Evento não encontrado");
    }

    const favorite = await prisma.userFavorite.upsert({
      where: { userId_eventId: { userId: req.userId, eventId: event_id } },
      update: {},
      create: { userId: req.userId, eventId: event_id },
    });

    res.status(201).json(favorite);
  })
);

favoritesRouter.delete(
  "/favorites",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { event_id } = favoriteBodySchema.parse(req.body);

    // Desfavoritar leva junto os avisos daquela palestra: deixá-los no
    // sininho seria lembrar de algo que o usuário disse não querer mais
    // acompanhar. `deleteMany` nos dois é idempotente por natureza — remover
    // o que já não existe é um no-op, que é o contrato esperado pelo cliente.
    //
    // Efeito colateral proposital: como a linha de Notification é também o
    // livro-caixa da deduplicação, apagá-la "rearma" o aviso. Se o usuário
    // favoritar de novo e o horário ainda estiver na janela, ele volta a ser
    // avisado — que é o comportamento desejado para uma ação explícita dele.
    await prisma.$transaction([
      prisma.userFavorite.deleteMany({
        where: { userId: req.userId, eventId: event_id },
      }),
      prisma.notification.deleteMany({
        where: { userId: req.userId, eventId: event_id },
      }),
    ]);

    res.status(204).send();
  })
);

favoritesRouter.get(
  "/favorites",
  requireAuth,
  asyncHandler(async (req, res) => {
    const favorites = await prisma.userFavorite.findMany({
      where: { userId: req.userId },
      include: { event: true },
      orderBy: { event: { startTime: "asc" } },
    });

    res.json(favorites.map((f) => f.event));
  })
);
