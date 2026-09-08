import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { ApiError } from "../lib/ApiError";
import { requireAuth } from "../middleware/auth";
import { authBodySchema } from "../schemas/auth";
import { hashPassword, signToken, verifyPassword } from "../lib/auth";

export const authRouter = Router();

authRouter.post(
  "/auth/register",
  asyncHandler(async (req, res) => {
    const { email, password } = authBodySchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw ApiError.conflict("Já existe uma conta com esse e-mail");
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({ data: { email, passwordHash } });

    res.status(201).json({
      token: signToken(user.id),
      user: { id: user.id, email: user.email, role: user.role },
    });
  })
);

authRouter.post(
  "/auth/login",
  asyncHandler(async (req, res) => {
    const { email, password } = authBodySchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw ApiError.unauthorized("E-mail ou senha incorretos");
    }

    res.json({
      token: signToken(user.id),
      user: { id: user.id, email: user.email, role: user.role },
    });
  })
);

authRouter.get(
  "/auth/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      throw ApiError.notFound("Usuário não encontrado");
    }

    res.json({ id: user.id, email: user.email, role: user.role });
  })
);
