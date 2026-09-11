import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { ApiError } from "../lib/ApiError";
import { requireAuth } from "../middleware/auth";
import {
  authBodySchema,
  forgotPasswordBodySchema,
  resetPasswordBodySchema,
} from "../schemas/auth";
import {
  hashPassword,
  signPasswordResetToken,
  signToken,
  verifyPassword,
  verifyPasswordResetToken,
} from "../lib/auth";
import { enviarEmail, envioDeEmailConfigurado } from "../lib/email";
import { montarEmailDeRecuperacao } from "../services/passwordReset";

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

// Pede o link de recuperação.
//
// Responde igual exista ou não a conta: se dissesse "e-mail não encontrado",
// qualquer pessoa poderia usar este endpoint para descobrir quem tem conta no
// evento. A mensagem é sempre a mesma, e a diferença fica só no que acontece
// por trás.
authRouter.post(
  "/auth/forgot-password",
  asyncHandler(async (req, res) => {
    const { email } = forgotPasswordBodySchema.parse(req.body);

    if (!envioDeEmailConfigurado()) {
      // Isto NÃO é sobre a conta pedida, e sim sobre o servidor: o recurso
      // está desligado para todo mundo. Dizer isso não revela nada e evita a
      // pessoa esperando por um e-mail que nunca vai sair.
      throw ApiError.serviceUnavailable(
        "A recuperação de senha por e-mail não está disponível no momento. Procure a organização do evento."
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const token = signPasswordResetToken(user.id, user.passwordHash);
      const mensagem = montarEmailDeRecuperacao(token);
      try {
        await enviarEmail({ to: user.email, ...mensagem });
      } catch (erro) {
        // Falha de envio é problema nosso, não da pessoa. Fica no log para
        // quem cuida do servidor; a resposta continua a mesma, porque um erro
        // aqui também denunciaria que a conta existe.
        console.error("[forgot-password] falha ao enviar e-mail:", erro);
      }
    }

    res.json({
      message:
        "Se existir uma conta com esse e-mail, enviamos um link para redefinir a senha.",
    });
  })
);

// Troca a senha usando o link recebido por e-mail.
authRouter.post(
  "/auth/reset-password",
  asyncHandler(async (req, res) => {
    const { token, password } = resetPasswordBodySchema.parse(req.body);

    let userId: string;
    try {
      // Sem o hash ainda: primeiro é preciso saber de quem é o token para
      // poder buscar o usuário. A conferência de uso único vem logo abaixo.
      userId = verifyPasswordResetToken(token, null).userId;
    } catch {
      throw ApiError.unauthorized("Link inválido ou expirado. Peça um novo.");
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw ApiError.unauthorized("Link inválido ou expirado. Peça um novo.");
    }

    try {
      verifyPasswordResetToken(token, user.passwordHash);
    } catch {
      throw ApiError.unauthorized("Este link já foi usado. Peça um novo.");
    }

    const passwordHash = await hashPassword(password);
    const atualizado = await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Já devolve a sessão: quem acabou de provar que tem acesso ao e-mail e
    // escolheu uma senha não precisa digitá-la de novo na tela seguinte.
    res.json({
      token: signToken(atualizado.id),
      user: { id: atualizado.id, email: atualizado.email, role: atualizado.role },
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
