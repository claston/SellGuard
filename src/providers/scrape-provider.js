export class ScrapeProviderError extends Error {
  constructor(message, { isTransient, cause, context } = {}) {
    super(message, { cause });
    this.name = "ScrapeProviderError";
    this.isTransient = Boolean(isTransient);
    this.context = context || {};
  }
}

export function createTransientScrapeError(message, context = {}, cause) {
  return new ScrapeProviderError(message, {
    isTransient: true,
    context,
    cause
  });
}

export function createPermanentScrapeError(message, context = {}, cause) {
  return new ScrapeProviderError(message, {
    isTransient: false,
    context,
    cause
  });
}

export function toCanonicalScrapePayload(url, scrapeResult) {
  if (typeof scrapeResult === "string") {
    return {
      url,
      rawContent: scrapeResult,
      contentType: "text/plain"
    };
  }

  if (!scrapeResult || typeof scrapeResult !== "object") {
    throw new TypeError("Scrape provider must return string or object with rawContent/content");
  }

  const rawContent = scrapeResult.rawContent ?? scrapeResult.content;
  if (typeof rawContent !== "string") {
    throw new TypeError("Scrape provider must return string or object with rawContent/content");
  }

  return {
    url,
    rawContent,
    contentType: scrapeResult.contentType || "text/plain"
  };
}
