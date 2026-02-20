import test from "node:test";
import assert from "node:assert/strict";

import { createEmailService, EmailDeliveryError } from "../../src/notifications/email-service.js";

function createMockLogger() {
  return {
    errorLogs: [],
    infoLogs: [],
    error(message, context) {
      this.errorLogs.push({ message, context });
    },
    info(message, context) {
      this.infoLogs.push({ message, context });
    }
  };
}

test("email service retries transient failures and succeeds", async () => {
  let attempts = 0;
  const logger = createMockLogger();
  const service = createEmailService({
    maxAttempts: 3,
    sleep: async () => {},
    logger,
    sendFn: async () => {
      attempts += 1;
      if (attempts < 3) {
        throw new EmailDeliveryError("temporary failure", { isTransient: true });
      }
      return { providerMessageId: "msg-123" };
    }
  });

  const result = await service.sendChangeAlert({
    monitoredUrl: { name: "Fees", url: "https://example.com/fees" },
    changeEvent: { id: 10, riskLevel: "high", summary: "changed" }
  });

  assert.equal(attempts, 3);
  assert.equal(result.providerMessageId, "msg-123");
});

test("email service does not retry permanent failures", async () => {
  let attempts = 0;
  const service = createEmailService({
    maxAttempts: 3,
    sleep: async () => {},
    sendFn: async () => {
      attempts += 1;
      throw new EmailDeliveryError("invalid recipient", { isTransient: false });
    }
  });

  await assert.rejects(
    () =>
      service.sendChangeAlert({
        monitoredUrl: { name: "Fees", url: "https://example.com/fees" },
        changeEvent: { id: 11, riskLevel: "medium", summary: "changed" }
      }),
    /invalid recipient/
  );

  assert.equal(attempts, 1);
});

