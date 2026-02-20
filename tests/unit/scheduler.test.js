import test from "node:test";
import assert from "node:assert/strict";

import { createScheduler } from "../../src/jobs/scheduler.js";

function createMockLogger() {
  const infoLogs = [];
  const warnLogs = [];
  const errorLogs = [];

  return {
    infoLogs,
    warnLogs,
    errorLogs,
    info(message, context) {
      infoLogs.push({ message, context });
    },
    warn(message, context) {
      warnLogs.push({ message, context });
    },
    error(message, context) {
      errorLogs.push({ message, context });
    }
  };
}

test("scheduler starts interval and can stop it", async () => {
  let capturedCallback = null;
  let clearedTimer = null;
  const fakeTimer = Symbol("timer");
  const runs = [];

  const scheduler = createScheduler({
    intervalMinutes: 5,
    runPipeline: async () => {
      runs.push("run");
      return {
        processedUrls: 1,
        persistedSnapshots: 1,
        createdChangeEvents: 0
      };
    },
    setIntervalFn: (callback) => {
      capturedCallback = callback;
      return fakeTimer;
    },
    clearIntervalFn: (timer) => {
      clearedTimer = timer;
    }
  });

  scheduler.start();
  assert.equal(typeof capturedCallback, "function");

  await capturedCallback();
  assert.equal(runs.length, 1);

  scheduler.stop();
  assert.equal(clearedTimer, fakeTimer);
});

test("scheduler prevents overlapping runs", async () => {
  let resolver;
  const logger = createMockLogger();
  const scheduler = createScheduler({
    intervalMinutes: 1,
    logger,
    runPipeline: async () =>
      new Promise((resolve) => {
        resolver = resolve;
      })
  });

  const firstRun = scheduler.runNow();
  const secondRun = await scheduler.runNow();

  assert.equal(secondRun.skipped, true);
  assert.equal(secondRun.reason, "overlap");
  assert.equal(logger.warnLogs.length, 1);

  resolver({
    processedUrls: 1,
    persistedSnapshots: 1,
    createdChangeEvents: 0
  });
  await firstRun;
});

test("scheduler emits run-level metrics in completion log", async () => {
  const logger = createMockLogger();
  let nowCounter = 0;
  const times = ["2026-02-20T00:00:00.000Z", "2026-02-20T00:00:01.500Z"];

  const scheduler = createScheduler({
    intervalMinutes: 1,
    logger,
    nowFn: () => new Date(times[nowCounter++]),
    runPipeline: async () => ({
      processedUrls: 3,
      persistedSnapshots: 3,
      createdChangeEvents: 1
    })
  });

  const runResult = await scheduler.runNow();

  assert.equal(runResult.skipped, false);
  assert.equal(logger.infoLogs.length, 2);

  const completion = logger.infoLogs[1];
  assert.equal(completion.message, "pipeline run completed");
  assert.equal(completion.context.processedUrls, 3);
  assert.equal(completion.context.persistedSnapshots, 3);
  assert.equal(completion.context.createdChangeEvents, 1);
  assert.equal(completion.context.durationMs, 1500);
});

