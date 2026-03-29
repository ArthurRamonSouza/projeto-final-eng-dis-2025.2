import type { RequestHandler } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import type { CreateAdBody, ManualRefillBody } from "../schemas/ads.schema.js";
import { adsService } from "../services/ads.service.js";
import { challengeService } from "../services/challenge.service.js";
import { poolService } from "../services/pool.service.js";
import { refillApiService } from "../services/refill-api.service.js";

export type AdsRouteParams = { adId: string };

export interface AdsController {
    create: RequestHandler<ParamsDictionary, unknown, CreateAdBody>;
    list: RequestHandler<ParamsDictionary>;
    getById: RequestHandler<AdsRouteParams>;
    getChallenge: RequestHandler<AdsRouteParams>;
    poolStatus: RequestHandler<AdsRouteParams>;
    manualRefill: RequestHandler<AdsRouteParams, unknown, ManualRefillBody>;
}

export const adsController: AdsController = {
    create: async (req, res) => {
        const result = await adsService.create(req.body);
        res.status(201).json(result);
    },

    list: async (_req, res) => {
        const result = await adsService.list();
        res.json(result);
    },

    getById: async (req, res) => {
        const { adId } = req.params;
        const ad = await adsService.getById(adId);
        res.json(ad);
    },

    getChallenge: async (req, res) => {
        const { adId } = req.params;
        const result = await challengeService.getChallenge(adId);
        res.json(result);
    },

    poolStatus: async (req, res) => {
        const { adId } = req.params;
        const result = await poolService.getStatus(adId);
        res.json(result);
    },

    manualRefill: async (req, res) => {
        const { adId } = req.params;
        const result = await refillApiService.manualRefill(adId, req.body);
        res.status(201).json(result);
    },
};
