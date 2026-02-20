import test from "node:test";
import assert from "node:assert/strict";

import { createInMemoryMetrics } from "../../src/observability/metrics.js";

test("in-memory metrics increments and snapshots counters", () => {
  const metrics = createInMemoryMetrics();
  metrics.increment("runs");
  metrics.increment("relevant_changes", 2);
  metrics.increment("emails_sent", 1);

  const snapshot = metrics.snapshot();
  assert.equal(snapshot.runs, 1);
  assert.equal(snapshot.relevant_changes, 2);
  assert.equal(snapshot.emails_sent, 1);
  assert.equal(snapshot.failures, 0);
});

