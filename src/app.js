import Fastify from "fastify";

export function buildApp(config) {
  const app = Fastify();

  app.get("/health", async () => ({
    status: "ok",
    service: "sellerguard",
    scheduleIntervalMinutes: config.schedule.intervalMinutes,
    timestamp: new Date().toISOString()
  }));

  return app;
}
