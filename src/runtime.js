import { buildApp as defaultBuildApp } from "./app.js";
import { createSnapshotPipeline } from "./core/pipeline/snapshot-pipeline.js";
import { runMigrations as defaultRunMigrations } from "./db/migrate.js";
import { createRepositories as defaultCreateRepositories } from "./db/repositories.js";
import { createScheduler as defaultCreateScheduler } from "./jobs/scheduler.js";

export function createRuntime({
  config,
  runMigrations = defaultRunMigrations,
  buildApp = defaultBuildApp,
  createRepositories = defaultCreateRepositories,
  createPipeline = createSnapshotPipeline,
  createScheduler = defaultCreateScheduler,
  scrapeProvider,
  logger = console
}) {
  if (!config) {
    throw new Error("Runtime requires config.");
  }
  if (!scrapeProvider || typeof scrapeProvider.scrape !== "function") {
    throw new Error("Runtime requires scrapeProvider with scrape(url) function.");
  }

  const app = buildApp(config);
  const repositories = createRepositories(config);
  const pipeline = createPipeline({
    repositories,
    scrapeProvider
  });
  const scheduler = createScheduler({
    intervalMinutes: config.schedule.intervalMinutes,
    runPipeline: () => pipeline.runOnce(),
    logger
  });

  return {
    async start() {
      if (config.db.driver === "pg-mem") {
        await runMigrations(config);
        logger.info("In-memory database initialized.");
      }

      await app.listen({
        host: "0.0.0.0",
        port: config.server.port
      });
      scheduler.start();
      logger.info(`SellerGuard listening on port ${config.server.port}`);
    },
    async stop() {
      scheduler.stop();
      await app.close();
    }
  };
}
