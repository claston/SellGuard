import test from "node:test";
import assert from "node:assert/strict";

import { loadConfig } from "../../src/config/env.js";
import { runMigrations } from "../../src/db/migrate.js";
import { createRepositories } from "../../src/db/repositories.js";
import { createSnapshotPipeline } from "../../src/core/pipeline/snapshot-pipeline.js";

function buildTestConfig() {
  return loadConfig({
    DB_DRIVER: "pg-mem",
    SCHEDULE_INTERVAL_MINUTES: "5",
    FIRECRAWL_API_KEY: "test",
    EMAIL_PROVIDER: "resend"
  });
}

test("snapshot pipeline persists snapshot for each active URL", async () => {
  const config = buildTestConfig();
  await runMigrations(config);
  const repositories = createRepositories(config);

  const urlA = await repositories.monitoredUrls.create({
    url: "https://example.com/a",
    name: "A",
    active: true
  });
  await repositories.monitoredUrls.create({
    url: "https://example.com/b",
    name: "B",
    active: false
  });

  const pipeline = createSnapshotPipeline({
    repositories,
    scrapeProvider: {
      async scrape() {
        return { rawContent: "hello world" };
      }
    }
  });

  const result = await pipeline.runOnce();
  const latest = await repositories.snapshots.getLatestByMonitoredUrlId(urlA.id);

  assert.equal(result.processedUrls, 1);
  assert.equal(result.persistedSnapshots, 1);
  assert.equal(latest.contentHash.length, 64);
});

test("snapshot pipeline creates change_event only when changed and relevant", async () => {
  const config = buildTestConfig();
  await runMigrations(config);
  const repositories = createRepositories(config);

  const monitored = await repositories.monitoredUrls.create({
    url: "https://example.com/fees",
    name: "Fees",
    keywords: ["fee", "penalty"],
    priority: "high",
    active: true
  });

  const responses = ["base content", "updated fee policy with penalty"];
  const pipeline = createSnapshotPipeline({
    repositories,
    scrapeProvider: {
      async scrape() {
        return { rawContent: responses.shift() };
      }
    }
  });

  const firstRun = await pipeline.runOnce();
  const secondRun = await pipeline.runOnce();

  assert.equal(firstRun.createdChangeEvents, 0);
  assert.equal(secondRun.createdChangeEvents, 1);

  const latestSnapshot = await repositories.snapshots.getLatestByMonitoredUrlId(monitored.id);
  assert.ok(latestSnapshot);
});
