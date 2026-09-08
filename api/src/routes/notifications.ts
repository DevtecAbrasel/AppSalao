import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { ApiError } from "../lib/ApiError";
import { requireAuth } from "../middleware/auth";

export const notificationsRouter = Router();

// Quantas notificações a lista devolve. O sininho é um histórico curto de
// avisos do evento, não um feed infinito — não vale complicar com paginação.
const MAX_NOTIFICATIONS = 50;

// O app faz polling deste endpoint (a cada minuto e ao focar a tela). Devolve
// a lista já com o evento embutido, pra tocar numa notificação abrir o
// detalhe sem uma segunda chamada, e o contador de não lidas — que vem do
// banco, e não da contagem da página, pra nunca divergir.
notificationsRouter.get(
  "/notifications",
  requireAuth,
  asyncHandler(async (req, res) => {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.userId },
        include: { event: true },
        orderBy: { createdAt: "desc" },
        take: MAX_NOTIFICATIONS,
      }),
      prisma.notification.count({
        where: { userId: req.userId, readAt: null },
      }),
    ]);

    res.json({
      unreadCount,
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        readAt: n.readAt,
        createdAt: n.createdAt,
        event: n.event,
      })),
    });
  })
);

notificationsRouter.post(
  "/notifications/:id/read",
  requireAuth,
  asyncHandler(async (req, res) => {
    // O filtro por userId no updateMany é o que impede marcar como lida a
    // notificação de outra pessoa: id de terceiro simplesmente não casa.
    const result = await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.userId, readAt: null },
      data: { readAt: new Date() },
    });

    if (result.count === 0) {
      // Ou não existe, ou não é dele, ou já estava lida. Só é erro no
      // primeiro caso — marcar de novo é idempotente de propósito, porque o
      // app pode reenviar ao reabrir a mesma notificação.
      const exists = await prisma.notification.findFirst({
        where: { id: req.params.id, userId: req.userId },
        select: { id: true },
      });
      if (!exists) throw ApiError.notFound("Notificação não encontrada");
    }

    const unreadCount = await prisma.notification.count({
      where: { userId: req.userId, readAt: null },
    });

    res.json({ unreadCount });
  })
);

notificationsRouter.post(
  "/notifications/read-all",
  requireAuth,
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { userId: req.userId, readAt: null },
      data: { readAt: new Date() },
    });

    res.json({ unreadCount: 0 });
  })
);
