import test from "node:test";
import assert from "node:assert/strict";

import { buildApp } from "../../src/app.js";
import { loadConfig } from "../../src/config/env.js";

test("loadConfig throws on missing required vars", () => {
  assert.throws(() => loadConfig({}), /Missing required environment variable/);
});

test("loadConfig supports pg-mem without DATABASE_URL", () => {
  const config = loadConfig({
    DB_DRIVER: "pg-mem",
    SCHEDULE_INTERVAL_MINUTES: "15",
    FIRECRAWL_API_KEY: "test",
    EMAIL_PROVIDER: "resend"
  });

  assert.equal(config.db.driver, "pg-mem");
  assert.equal(config.db.url, undefined);
});

test("health endpoint returns ok", async () => {
  const config = loadConfig({
    APP_PORT: "3000",
    SCHEDULE_INTERVAL_MINUTES: "15",
    DATABASE_URL: "postgres://user:pass@localhost:5432/sellerguard",
    FIRECRAWL_API_KEY: "test",
    EMAIL_PROVIDER: "resend"
  });

  const app = buildApp(config);
  const response = await app.inject({
    method: "GET",
    url: "/health"
  });

  const payload = response.json();

  assert.equal(response.statusCode, 200);
  assert.equal(payload.status, "ok");
  assert.equal(payload.service, "sellerguard");

  await app.close();
});
