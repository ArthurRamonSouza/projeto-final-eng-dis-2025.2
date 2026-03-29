import type {
    Ad,
    AdContent,
    GenerationJob,
} from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export type CreateAdInput = {
    id: string;
    title: string;
    advertiserName: string;
    status: string;
    content: {
        contentType: string;
        contentText: string;
    };
    initialJob?: {
        requestedCount: number;
        reason: string;
        status: string;
    };
};

export type CreateAdResult = {
    ad: Ad;
    content: AdContent;
    initialJob: GenerationJob | null;
};

export const adRepository = {
    async createWithContent(input: CreateAdInput): Promise<CreateAdResult> {
        return prisma.$transaction(async (tx) => {
            const ad = await tx.ad.create({
                data: {
                    id: input.id,
                    title: input.title,
                    advertiserName: input.advertiserName,
                    status: input.status,
                },
            });

            const content = await tx.adContent.create({
                data: {
                    adId: ad.id,
                    contentType: input.content.contentType,
                    contentText: input.content.contentText,
                },
            });

            let initialJob: GenerationJob | null = null;
            if (input.initialJob) {
                initialJob = await tx.generationJob.create({
                    data: {
                        adId: ad.id,
                        requestedCount: input.initialJob.requestedCount,
                        reason: input.initialJob.reason,
                        status: input.initialJob.status,
                    },
                });
            }

            return { ad, content, initialJob };
        });
    },

    async findById(id: string): Promise<Ad | null> {
        return prisma.ad.findUnique({ where: { id } });
    },

    async list(): Promise<Ad[]> {
        return prisma.ad.findMany({
            orderBy: { createdAt: "desc" },
        });
    },
};
