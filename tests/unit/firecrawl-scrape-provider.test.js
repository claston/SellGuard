import test from "node:test";
import assert from "node:assert/strict";

import { createFirecrawlScrapeProvider } from "../../src/providers/firecrawl/firecrawl-scrape-provider.js";
import { ScrapeProviderError } from "../../src/providers/scrape-provider.js";

function createMockLogger() {
  const logs = [];
  return {
    logs,
    error(message, context) {
      logs.push({ message, context });
    }
  };
}

test("firecrawl provider returns markdown content on success", async () => {
  const provider = createFirecrawlScrapeProvider({
    apiKey: "test-key",
    fetchFn: async () => ({
      ok: true,
      status: 200,
      async json() {
        return {
          data: {
            markdown: "updated policy content"
          }
        };
      }
    }),
    logger: createMockLogger()
  });

  const result = await provider.scrape("https://example.com/policy");

  assert.equal(result.rawContent, "updated policy content");
  assert.equal(result.contentType, "text/markdown");
});

test("firecrawl provider retries transient failures with capped attempts", async () => {
  let callCount = 0;

  const provider = createFirecrawlScrapeProvider({
    apiKey: "test-key",
    maxAttempts: 3,
    sleep: async () => {},
    fetchFn: async () => {
      callCount += 1;
      if (callCount < 3) {
        return {
          ok: false,
          status: 503,
          async json() {
            return { error: "upstream unavailable" };
          }
        };
      }

      return {
        ok: true,
        status: 200,
        async json() {
          return { data: { markdown: "ok after retry" } };
        }
      };
    },
    logger: createMockLogger()
  });

  const result = await provider.scrape("https://example.com/retry");

  assert.equal(callCount, 3);
  assert.equal(result.rawContent, "ok after retry");
});

test("firecrawl provider does not retry permanent failures", async () => {
  let callCount = 0;
  const logger = createMockLogger();

  const provider = createFirecrawlScrapeProvider({
    apiKey: "test-key",
    maxAttempts: 3,
    sleep: async () => {},
    fetchFn: async () => {
      callCount += 1;
      return {
        ok: false,
        status: 404,
        async json() {
          return { error: "not found" };
        }
      };
    },
    logger
  });

  await assert.rejects(() => provider.scrape("https://example.com/missing"), (error) => {
    assert.ok(error instanceof ScrapeProviderError);
    assert.equal(error.isTransient, false);
    assert.match(error.message, /not found/);
    return true;
  });

  assert.equal(callCount, 1);
  assert.equal(logger.logs.length, 1);
});

