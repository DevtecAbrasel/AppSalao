import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { ApiError } from "../lib/ApiError";
import { requireAppKey } from "../middleware/apiKey";
import { requireAdmin, requireAuth } from "../middleware/auth";
import { createEventSchema, eventListQuerySchema, updateEventSchema } from "../schemas/event";

export const eventsRouter = Router();

// Evento do Salão Abrasel roda em horário de Brasília — filtrar "o dia X"
// significa o dia civil em America/Sao_Paulo (UTC-03:00), não em UTC.
const BRASILIA_OFFSET = "-03:00";

function dayRangeInBrasilia(date: string) {
  return {
    start: new Date(`${date}T00:00:00${BRASILIA_OFFSET}`),
    end: new Date(`${date}T23:59:59.999${BRASILIA_OFFSET}`),
  };
}

eventsRouter.get(
  "/events",
  requireAppKey,
  asyncHandler(async (req, res) => {
    const query = eventListQuerySchema.parse(req.query);

    const where: Record<string, unknown> = {};

    if (query.date) {
      const { start, end } = dayRangeInBrasilia(query.date);
      where.startTime = { gte: start, lte: end };
    }

    if (query.category) {
      where.category = query.category;
    }

    const events = await prisma.event.findMany({
      where,
      orderBy: { startTime: "asc" },
    });

    res.json(events);
  })
);

eventsRouter.get(
  "/events/:id",
  requireAppKey,
  asyncHandler(async (req, res) => {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });

    if (!event) {
      throw ApiError.notFound("Evento não encontrado");
    }

    res.json(event);
  })
);

eventsRouter.post(
  "/events",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = createEventSchema.parse(req.body);

    const event = await prisma.event.create({
      data: {
        ...data,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
      },
    });

    res.status(201).json(event);
  })
);

eventsRouter.put(
  "/events/:id",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = updateEventSchema.parse(req.body);

    const existing = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      throw ApiError.notFound("Evento não encontrado");
    }

    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: {
        ...data,
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime ? new Date(data.endTime) : undefined,
      },
    });

    res.json(event);
  })
);

eventsRouter.delete(
  "/events/:id",
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const existing = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!existing) {
      throw ApiError.notFound("Evento não encontrado");
    }

    await prisma.event.delete({ where: { id: req.params.id } });

    res.status(204).send();
  })
);
