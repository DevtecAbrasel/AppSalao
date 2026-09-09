import { z } from "zod";

export const eventListQuerySchema = z.object({
  date: z.string().date().optional(),
  category: z.string().min(1).optional(),
});

export const createEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  speaker: z.string().min(1).nullish(),
  locationName: z.string().min(1),
  locationMapX: z.number().min(0).max(1).nullish(),
  locationMapY: z.number().min(0).max(1).nullish(),
  startTime: z.string().datetime({ offset: true }),
  endTime: z.string().datetime({ offset: true }),
  category: z.string().min(1).nullish(),
});

export const updateEventSchema = createEventSchema.partial();
