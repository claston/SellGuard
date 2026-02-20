export class EmailDeliveryError extends Error {
  constructor(message, { isTransient = false, cause, context } = {}) {
    super(message, { cause });
    this.name = "EmailDeliveryError";
    this.isTransient = Boolean(isTransient);
    this.context = context || {};
  }
}

function normalizeError(error) {
  if (error instanceof EmailDeliveryError) {
    return error;
  }

  return new EmailDeliveryError(error?.message || "Email delivery failed.", {
    isTransient: false,
    cause: error
  });
}

export function createEmailService({
  sendFn,
  maxAttempts = 3,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  logger = console
} = {}) {
  if (typeof sendFn !== "function") {
    throw new Error("Email service requires sendFn.");
  }

  const safeAttempts = Number.isInteger(maxAttempts) && maxAttempts > 0 ? maxAttempts : 1;

  return {
    async sendChangeAlert({ monitoredUrl, changeEvent }) {
      for (let attempt = 1; attempt <= safeAttempts; attempt += 1) {
        try {
          return await sendFn({ monitoredUrl, changeEvent });
        } catch (rawError) {
          const error = normalizeError(rawError);
          logger.error("email delivery attempt failed", {
            monitoredUrlId: monitoredUrl?.id,
            changeEventId: changeEvent?.id,
            attempt,
            maxAttempts: safeAttempts,
            transient: error.isTransient,
            error: error.message
          });

          if (!error.isTransient || attempt >= safeAttempts) {
            throw error;
          }

          await sleep(Math.min(1000 * attempt, 3000));
        }
      }

      throw new EmailDeliveryError("Email delivery failed after maximum retry attempts.", {
        isTransient: true
      });
    }
  };
}

