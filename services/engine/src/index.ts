import Fastify from "fastify";

const app = Fastify({ logger: true });

app.get("/health", async () => ({ status: "ok" }));

const port = Number(process.env.PORT ?? 8000);

app
  .listen({ host: "0.0.0.0", port })
  .then(() => {
    app.log.info(`engine listening on ${port}`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
