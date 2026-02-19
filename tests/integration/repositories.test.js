import test from "node:test";
import assert from "node:assert/strict";

import { loadConfig } from "../../src/config/env.js";
import { runMigrations } from "../../src/db/migrate.js";
import { createRepositories } from "../../src/db/repositories.js";

function buildTestConfig() {
  return loadConfig({
    DB_DRIVER: "pg-mem",
    SCHEDULE_INTERVAL_MINUTES: "5",
    FIRECRAWL_API_KEY: "test",
    EMAIL_PROVIDER: "resend"
  });
}

test("monitored_url repository supports CRUD", async () => {
  const config = buildTestConfig();
  await runMigrations(config);
  const repositories = createRepositories(config);

  const created = await repositories.monitoredUrls.create({
    url: "https://example.com/policies",
    name: "Example Policies",
    priority: "high",
    keywords: ["seller", "shipping"],
    active: true
  });

  assert.equal(created.url, "https://example.com/policies");
  assert.equal(created.priority, "high");
  assert.deepEqual(created.keywords, ["seller", "shipping"]);

  const fromUrl = await repositories.monitoredUrls.getByUrl(created.url);
  assert.equal(fromUrl.id, created.id);

  const updated = await repositories.monitoredUrls.update(created.id, {
    name: "Policies Updated",
    priority: "low",
    active: false
  });

  assert.equal(updated.name, "Policies Updated");
  assert.equal(updated.priority, "low");
  assert.equal(updated.active, false);

  await repositories.monitoredUrls.delete(created.id);
  const afterDelete = await repositories.monitoredUrls.getById(created.id);
  assert.equal(afterDelete, null);
});

test("snapshot repository inserts and gets latest by monitored URL", async () => {
  const config = buildTestConfig();
  await runMigrations(config);
  const repositories = createRepositories(config);

  const monitoredUrl = await repositories.monitoredUrls.create({
    url: "https://example.com/terms",
    name: "Example Terms",
    keywords: []
  });

  await repositories.snapshots.insert({
    monitoredUrlId: monitoredUrl.id,
    rawContent: "old content",
    normalizedContent: "old content",
    contentHash: "hash-old",
    scrapedAt: "2026-01-01T00:00:00.000Z"
  });

  const latestInserted = await repositories.snapshots.insert({
    monitoredUrlId: monitoredUrl.id,
    rawContent: "new content",
    normalizedContent: "new content",
    contentHash: "hash-new",
    scrapedAt: "2026-01-02T00:00:00.000Z"
  });

  const latest = await repositories.snapshots.getLatestByMonitoredUrlId(monitoredUrl.id);
  assert.equal(latest.id, latestInserted.id);
  assert.equal(latest.contentHash, "hash-new");
});

test("change_event repository inserts and updates notified_at", async () => {
  const config = buildTestConfig();
  await runMigrations(config);
  const repositories = createRepositories(config);

  const monitoredUrl = await repositories.monitoredUrls.create({
    url: "https://example.com/fees",
    name: "Example Fees",
    keywords: ["fee"]
  });

  const previousSnapshot = await repositories.snapshots.insert({
    monitoredUrlId: monitoredUrl.id,
    rawContent: "v1",
    normalizedContent: "v1",
    contentHash: "hash-v1",
    scrapedAt: "2026-01-01T00:00:00.000Z"
  });

  const currentSnapshot = await repositories.snapshots.insert({
    monitoredUrlId: monitoredUrl.id,
    rawContent: "v2",
    normalizedContent: "v2",
    contentHash: "hash-v2",
    scrapedAt: "2026-01-02T00:00:00.000Z"
  });

  const changeEvent = await repositories.changeEvents.insert({
    monitoredUrlId: monitoredUrl.id,
    previousSnapshotId: previousSnapshot.id,
    currentSnapshotId: currentSnapshot.id,
    riskLevel: "medium",
    relevanceScore: 80,
    summary: "Fee policy changed",
    businessImpact: "Potential margin impact",
    recommendation: "Review pricing strategy"
  });

  assert.equal(changeEvent.notifiedAt, null);

  const notifiedAt = "2026-01-03T10:00:00.000Z";
  const updated = await repositories.changeEvents.markNotified(changeEvent.id, notifiedAt);

  assert.equal(updated.id, changeEvent.id);
  assert.equal(updated.notifiedAt, notifiedAt);
});
