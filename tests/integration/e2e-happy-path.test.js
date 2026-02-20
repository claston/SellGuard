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

test("e2e happy path: scrape -> snapshot -> detect -> event -> notify", async () => {
  const config = buildTestConfig();
  await runMigrations(config);
  const repositories = createRepositories(config);

  const monitoredUrl = await repositories.monitoredUrls.create({
    url: "https://example.com/policy",
    name: "Policy",
    keywords: ["fee", "penalty"],
    priority: "high",
    active: true
  });

  let scrapeCalls = 0;
  const firecrawlMock = {
    async scrape(url) {
      assert.equal(url, monitoredUrl.url);
      scrapeCalls += 1;
      if (scrapeCalls === 1) {
        return { rawContent: "baseline policy content" };
      }

      return { rawContent: "updated fee and penalty policy content" };
    }
  };

  const sentAlerts = [];
  let markNotifiedCalls = 0;
  let lastNotifiedEvent = null;
  const emailMock = {
    async sendChangeAlert(payload) {
      sentAlerts.push(payload);
      return { providerMessageId: `msg-${sentAlerts.length}` };
    }
  };

  const baseChangeEvents = repositories.changeEvents;
  const instrumentedRepositories = {
    ...repositories,
    changeEvents: {
      ...baseChangeEvents,
      async insert(payload) {
        return baseChangeEvents.insert(payload);
      },
      async markNotified(id, notifiedAt) {
        markNotifiedCalls += 1;
        lastNotifiedEvent = await baseChangeEvents.markNotified(id, notifiedAt);
        return lastNotifiedEvent;
      }
    }
  };

  const pipeline = createSnapshotPipeline({
    repositories: instrumentedRepositories,
    scrapeProvider: firecrawlMock,
    emailService: emailMock
  });

  const firstRun = await pipeline.runOnce();
  const secondRun = await pipeline.runOnce();

  assert.equal(firstRun.processedUrls, 1);
  assert.equal(firstRun.persistedSnapshots, 1);
  assert.equal(firstRun.createdChangeEvents, 0);
  assert.equal(firstRun.sentEmails, 0);

  assert.equal(secondRun.processedUrls, 1);
  assert.equal(secondRun.persistedSnapshots, 1);
  assert.equal(secondRun.createdChangeEvents, 1);
  assert.equal(secondRun.sentEmails, 1);

  assert.equal(scrapeCalls, 2);
  assert.equal(sentAlerts.length, 1);
  assert.equal(sentAlerts[0].monitoredUrl.id, monitoredUrl.id);
  assert.equal(markNotifiedCalls, 1);
  assert.ok(lastNotifiedEvent);
  assert.ok(lastNotifiedEvent.notifiedAt);
});
