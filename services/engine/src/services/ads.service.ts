import { env } from "../config/env.js";
import { HttpError } from "../errors/http-error.js";
import { adRepository } from "../repositories/ad.repository.js";
import type { CreateAdBody } from "../schemas/ads.schema.js";
import { newAdId } from "../utils/ids.js";

function toAdResponse(ad: {
    id: string;
    title: string;
    advertiserName: string;
    status: string;
}) {
    return {
        id: ad.id,
        title: ad.title,
        advertiser_name: ad.advertiserName,
        status: ad.status,
    };
}

export const adsService = {
    async create(body: CreateAdBody) {
        const id = newAdId();
        const { ad, content, initialJob } =
            await adRepository.createWithContent({
                id,
                title: body.title,
                advertiserName: body.advertiser_name,
                status: "active",
                content: {
                    contentType: body.content_type,
                    contentText: body.content_text,
                },
                initialJob: {
                    requestedCount: env.POOL_TARGET,
                    reason: "initial_fill",
                    status: "pending",
                },
            });

        return {
            ad: toAdResponse(ad),
            content: {
                id: content.id,
                content_type: content.contentType,
            },
            initial_refill_requested: initialJob !== null,
        };
    },

    async list() {
        const items = await adRepository.list();
        return { items: items.map(toAdResponse) };
    },

    async getById(adId: string) {
        const ad = await adRepository.findById(adId);
        if (!ad) {
            throw new HttpError(404, "Anúncio não encontrado.", {
                code: "AD_NOT_FOUND",
            });
        }
        return toAdResponse(ad);
    },
};
