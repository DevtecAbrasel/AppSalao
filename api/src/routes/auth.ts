import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { ApiError } from "../lib/ApiError";
import { requireAuth } from "../middleware/auth";
import { authRateLimiter } from "../middleware/rateLimit";
import { authBodySchema, resetPasswordBodySchema } from "../schemas/auth";
import { hashPassword, signToken, verifyPassword } from "../lib/auth";

export const authRouter = Router();

authRouter.post(
  "/auth/register",
  authRateLimiter,
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
  authRateLimiter,
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

// Redefinição de senha direto no app, sem e-mail e sem código.
//
// A conta é localizada pelo E-MAIL, que é o identificador do login e a única
// coluna única de `users` além do id.
//
// ATENÇÃO, para quem for mexer aqui: este endpoint troca a senha de quem
// souber o e-mail, e nada mais. Não é uma recuperação verificada — é uma
// troca aberta, decidida assim de propósito para o app do evento, onde o que
// está em jogo são favoritos e avisos. Se um dia a conta guardar algo que não
// se possa perder, o caminho é voltar a exigir um segundo canal (link ou
// código), não remendar este.
//
// A única exceção são as contas ADMIN, que editam a programação do evento
// inteiro: para elas a troca aberta seria um convite. Continuam sendo
// alteradas pelo script `admin:create`.
//
// O rate limit abaixo é a única barreira contra alguém varrendo e-mails
// tentando descobrir quais existem (a resposta 404 já não diferencia por
// tempo, mas sem limite de tentativas essa varredura seria de graça).
authRouter.post(
  "/auth/reset-password",
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = resetPasswordBodySchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw ApiError.notFound("Não encontramos uma conta com esse e-mail");
    }

    if (user.role === "ADMIN") {
      throw ApiError.forbidden(
        "Contas de administrador não trocam a senha por aqui. Procure a equipe técnica."
      );
    }

    // Mesmo caminho do cadastro: bcrypt com o mesmo custo, pela mesma função.
    // A senha em texto nunca é gravada nem registrada em log.
    const passwordHash = await hashPassword(password);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    // Sem devolver sessão: o fluxo pedido termina na tela de login, com a
    // pessoa entrando com a senha nova — o que também confirma que deu certo.
    res.json({ message: "Senha alterada. Entre com a nova senha." });
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