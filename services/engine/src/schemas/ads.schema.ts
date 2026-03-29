import { z } from "zod";

export const createAdBodySchema = z.object({
    title: z.string().min(1),
    advertiser_name: z.string().min(1),
    content_type: z.string().min(1),
    content_text: z.string().min(1),
});

export type CreateAdBody = z.infer<typeof createAdBodySchema>;

export const adIdParamsSchema = z.object({
    adId: z.string().min(1),
});

export const manualRefillBodySchema = z.object({
    requested_count: z.number().int().positive(),
});

export type ManualRefillBody = z.infer<typeof manualRefillBodySchema>;

export const pooledChallengeSchema = z.object({
    id: z.string(),
    type: z.string(),
    question: z.string(),
    options: z.array(z.string()),
    source: z.enum(["ai", "static"]).default("ai"),
});
