import express, { type Express } from "express";
import cors from "cors";
import { router } from "./router";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { asyncHandler } from "./middleware/async-handler.js";
import { ipRateLimit } from "./middleware/ip-rate-limit.js";

export const createApp = async (): Promise<Express> => {
    const app: Express = express();

    if (env.TRUST_PROXY) {
        app.set("trust proxy", 1);
    }

    app.use(cors());
    app.use(express.json());
    app.use(asyncHandler(ipRateLimit));

    app.get("/", (_req, res) => {
        res.json({ message: "engine working" });
    });

    app.use(router);
    app.use(errorHandler);

    return app;
};
