import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { ApiError } from "../lib/ApiError";
import { requireAdmin, requireAuth } from "../middleware/auth";

export const usersRouter = Router();

// Toda rota daqui exige conta com papel ADMIN — a proteção mora no servidor,
// não em esconder a tela no app. Um usuário comum que monte a requisição na
// mão recebe 403.
usersRouter.use("/admin", requireAuth, requireAdmin);

usersRouter.get(
  "/admin/users",
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      // Nunca selecionamos passwordHash: não há motivo para um hash de senha
      // trafegar até o app, mesmo para um administrador.
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { favorites: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(
      users.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt,
        favoritesCount: u._count.favorites,
        // Deixa explícito para a interface quem não pode ser removido, em vez
        // de a regra existir só no servidor e a tela descobrir com um erro.
        isSelf: u.id === req.userId,
      }))
    );
  })
);

usersRouter.delete(
  "/admin/users/:id",
  asyncHandler(async (req, res) => {
    // Excluir a própria conta derrubaria o admin do painel no meio do evento,
    // e se fosse o único administrador ninguém mais entraria. Bloqueado aqui,
    // no servidor, e não apenas escondendo o botão.
    if (req.params.id === req.userId) {
      throw ApiError.badRequest("Você não pode excluir a própria conta de administrador");
    }

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      throw ApiError.notFound("Usuário não encontrado");
    }

    // Favoritos e notificações saem junto por onDelete: Cascade no schema.
    await prisma.user.delete({ where: { id: req.params.id } });

    res.status(204).send();
  })
);
