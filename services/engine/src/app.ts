import express, { type Express } from "express";
import cors from "cors";
import { router } from "./router";
import { errorHandler } from "./middleware/error-handler.js";

export const createApp = async (): Promise<Express> => {
    const app: Express = express();

    app.use(cors());
    app.use(express.json());

    app.get("/", (_req, res) => {
        res.json({ message: "engine working" });
    });

    app.use(router);
    app.use(errorHandler);

    return app;
};
