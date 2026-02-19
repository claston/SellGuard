import { buildApp } from "./app.js";
import { loadConfig } from "./config/env.js";
import { runMigrations } from "./db/migrate.js";

async function main() {
  const config = loadConfig();

  if (config.db.driver === "pg-mem") {
    await runMigrations(config);
    console.log("In-memory database initialized.");
  }

  const app = buildApp(config);

  await app.listen({
    host: "0.0.0.0",
    port: config.server.port
  });

  console.log(`SellerGuard listening on port ${config.server.port}`);
}

main();
