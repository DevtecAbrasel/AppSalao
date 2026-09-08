import { RequestHandler } from "express";
import { verifyToken } from "../lib/auth";
import { ApiError } from "../lib/ApiError";
import { prisma } from "../lib/prisma";

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

  if (!token) {
    throw ApiError.unauthorized("Token de autenticação ausente");
  }

  try {
    const { userId } = verifyToken(token);
    req.userId = userId;
    next();
  } catch {
    throw ApiError.unauthorized("Token de autenticação inválido ou expirado");
  }
};

// Portão das rotas administrativas. Roda DEPOIS de requireAuth e confere o
// papel no banco, não no token: um token de 30 dias assinado antes de alguém
// perder o acesso continuaria valendo se o papel viajasse dentro dele.
//
// Responde 403 (e não 404 nem 401) de propósito: o usuário está autenticado,
// só não tem permissão — esconder isso não protege nada e atrapalha o suporte.
export const requireAdmin: RequestHandler = async (req, _res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { role: true },
    });

    if (!user || user.role !== "ADMIN") {
      throw ApiError.forbidden("Acesso restrito a administradores");
    }

    next();
  } catch (err) {
    next(err);
  }
};
