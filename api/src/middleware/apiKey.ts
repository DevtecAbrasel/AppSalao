import { RequestHandler } from "express";
import { env } from "../env";
import { ApiError } from "../lib/ApiError";

// Chave do app: identifica o cliente, não a pessoa. Vale para todas as rotas
// consumidas pelo app mobile.
//
// Quem pode ADMINISTRAR não é decidido aqui — isso é papel de conta, via
// `requireAdmin` (middleware/auth.ts). Antes existia também um
// `requireAdminKey` com um `ADMIN_API_KEY` compartilhado protegendo o CRUD de
// eventos; foi removido porque um segredo único dá poder total de admin sem
// identidade, sem trilha de auditoria e sem como revogar de uma pessoa só.
export const requireAppKey: RequestHandler = (req, _res, next) => {
  const key = req.header("x-api-key");

  if (key !== env.APP_API_KEY) {
    throw ApiError.unauthorized("x-api-key inválida ou ausente");
  }

  next();
};
