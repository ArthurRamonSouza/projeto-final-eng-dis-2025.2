import express, { type Express } from "express";
import cors from "cors";
import { router } from "./router.js";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { asyncHandler } from "./middleware/async-handler.js";
import { httpMetricsMiddleware } from "./middleware/http-metrics.js";
import { loadSheddingMiddleware } from "./middleware/load-shedding.js";
import { ipRateLimit } from "./middleware/ip-rate-limit.js";
import { metricsRouter } from "./routes/metrics.routes.js";

export const createApp = async (): Promise<Express> => {
    const app: Express = express();

    if (env.TRUST_PROXY) {
        app.set("trust proxy", 1);
    }

    app.use(cors());
    app.use(express.json());
    app.use(httpMetricsMiddleware);
    app.use(asyncHandler(loadSheddingMiddleware));
    app.use(asyncHandler(ipRateLimit));

    app.get("/", (_req, res) => {
        res.json({ message: "engine working" });
    });

    app.use("/metrics", metricsRouter);
    app.use(router);
    app.use(errorHandler);

    return app;
};
