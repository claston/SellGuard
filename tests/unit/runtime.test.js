import test from "node:test";
import assert from "node:assert/strict";

import { createRuntime } from "../../src/runtime.js";

test("runtime starts app and scheduler with configured interval", async () => {
  const calls = {
    listen: 0,
    schedulerStart: 0,
    schedulerStop: 0
  };

  const fakeApp = {
    async listen() {
      calls.listen += 1;
    },
    async close() {}
  };

  const fakeScheduler = {
    start() {
      calls.schedulerStart += 1;
    },
    stop() {
      calls.schedulerStop += 1;
    }
  };

  const runtime = createRuntime({
    config: {
      server: { port: 3000 },
      schedule: { intervalMinutes: 5 },
      db: { driver: "pg-mem" }
    },
    runMigrations: async () => {},
    buildApp: () => fakeApp,
    createScheduler: ({ intervalMinutes }) => {
      assert.equal(intervalMinutes, 5);
      return fakeScheduler;
    },
    createPipeline: () => ({
      async runOnce() {
        return {};
      }
    }),
    createRepositories: () => ({}),
    scrapeProvider: { async scrape() {} },
    logger: { info() {} }
  });

  await runtime.start();
  assert.equal(calls.listen, 1);
  assert.equal(calls.schedulerStart, 1);

  await runtime.stop();
  assert.equal(calls.schedulerStop, 1);
});

test("runtime throws when scrapeProvider is not provided", async () => {
  assert.throws(
    () =>
      createRuntime({
        config: {
          server: { port: 3000 },
          schedule: { intervalMinutes: 5 },
          db: { driver: "pg-mem" }
        },
        runMigrations: async () => {},
        buildApp: () => ({
          async listen() {},
          async close() {}
        }),
        createScheduler: () => ({
          start() {},
          stop() {}
        }),
        createPipeline: () => ({
          async runOnce() {
            return {};
          }
        }),
        createRepositories: () => ({}),
        logger: { info() {} }
      }),
    /Runtime requires scrapeProvider/
  );
});
