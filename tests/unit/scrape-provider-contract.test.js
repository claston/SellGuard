import test from "node:test";
import assert from "node:assert/strict";

import {
  ScrapeProviderError,
  createTransientScrapeError,
  createPermanentScrapeError,
  toCanonicalScrapePayload
} from "../../src/providers/scrape-provider.js";

test("toCanonicalScrapePayload returns canonical payload for string content", () => {
  const payload = toCanonicalScrapePayload("https://example.com/policy", "hello world");

  assert.deepEqual(payload, {
    url: "https://example.com/policy",
    rawContent: "hello world",
    contentType: "text/plain"
  });
});

test("toCanonicalScrapePayload maps provider payload aliases", () => {
  const payload = toCanonicalScrapePayload("https://example.com/policy", {
    content: "new terms",
    contentType: "text/html"
  });

  assert.deepEqual(payload, {
    url: "https://example.com/policy",
    rawContent: "new terms",
    contentType: "text/html"
  });
});

test("toCanonicalScrapePayload throws when provider returns unsupported payload", () => {
  assert.throws(
    () => toCanonicalScrapePayload("https://example.com/policy", { html: "<p>x</p>" }),
    /must return string or object with rawContent\/content/
  );
});

test("transient and permanent scrape errors are distinguishable", () => {
  const transient = createTransientScrapeError("timeout", { url: "https://example.com" });
  const permanent = createPermanentScrapeError("not found", { url: "https://example.com" });

  assert.ok(transient instanceof ScrapeProviderError);
  assert.ok(permanent instanceof ScrapeProviderError);
  assert.equal(transient.isTransient, true);
  assert.equal(permanent.isTransient, false);
});
