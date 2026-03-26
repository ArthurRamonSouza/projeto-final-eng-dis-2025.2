import { createApp } from "./app";

async function startServer() {
    const app = await createApp();

    const host: string = String(process.env.ENGINE_HOST ?? "0.0.0.0");
    const port: number = Number(process.env.ENGINE_PORT ?? 8000);

    app.listen(port, host, () => {
        console.log(`Service engine runing at host ${host} and port ${port}`);
        console.log(`URL to access local: http://localhost:${port}`);
    });
}

startServer();
