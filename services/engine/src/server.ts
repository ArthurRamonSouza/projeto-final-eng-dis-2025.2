import "dotenv/config";
import { createApp } from "./app.js";
import {
    closeRefillInfrastructure,
    startRefillWorker,
} from "./queues/refill-queue.js";

async function startServer() {
    startRefillWorker();

    const app = await createApp();

    const host: string = String(process.env.ENGINE_HOST ?? "0.0.0.0");
    const port: number = Number(process.env.ENGINE_PORT ?? 8000);

    const server = app.listen(port, host, () => {
        console.log(`Service engine runing at host ${host} and port ${port}`);
        console.log(`URL to access local: http://localhost:${port}`);
    });

    const shutdown = async (): Promise<void> => {
        await new Promise<void>((resolve, reject) => {
            server.close((err) => (err ? reject(err) : resolve()));
        });
        await closeRefillInfrastructure();
    };

    process.once("SIGTERM", () => {
        void shutdown().finally(() => process.exit(0));
    });
    process.once("SIGINT", () => {
        void shutdown().finally(() => process.exit(0));
    });
}

startServer();
