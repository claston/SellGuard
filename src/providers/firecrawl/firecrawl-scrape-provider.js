import {
  createPermanentScrapeError,
  createTransientScrapeError
} from "../scrape-provider.js";

const DEFAULT_BASE_URL = "https://api.firecrawl.dev/v1";
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_ATTEMPTS = 3;

function isTransientStatus(status) {
  return status === 429 || status >= 500;
}

function createTimeoutSignal(timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => clearTimeout(timer)
  };
}

async function parseResponseBody(response, url) {
  try {
    return await response.json();
  } catch (error) {
    throw createTransientScrapeError(
      "Firecrawl returned invalid JSON response.",
      {
        url,
        status: response?.status
      },
      error
    );
  }
}

function getRawContentFromFirecrawlBody(body) {
  if (!body || typeof body !== "object") {
    return null;
  }

  const data = body.data && typeof body.data === "object" ? body.data : body;
  const markdown = typeof data.markdown === "string" ? data.markdown : null;
  if (markdown && markdown.trim() !== "") {
    return markdown;
  }

  const content = typeof data.content === "string" ? data.content : null;
  if (content && content.trim() !== "") {
    return content;
  }

  const html = typeof data.html === "string" ? data.html : null;
  if (html && html.trim() !== "") {
    return html;
  }

  return null;
}

function getErrorMessage(status, body) {
  if (body && typeof body === "object") {
    if (typeof body.error === "string" && body.error.trim() !== "") {
      return body.error;
    }

    if (typeof body.message === "string" && body.message.trim() !== "") {
      return body.message;
    }
  }

  return `Firecrawl request failed with status ${status}`;
}

export function createFirecrawlScrapeProvider({
  apiKey,
  baseUrl = DEFAULT_BASE_URL,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  fetchFn = globalThis.fetch,
  logger = console,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
} = {}) {
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("Firecrawl provider requires apiKey.");
  }

  if (typeof fetchFn !== "function") {
    throw new Error("Firecrawl provider requires fetchFn.");
  }

  const safeMaxAttempts = Number.isInteger(maxAttempts) && maxAttempts > 0 ? maxAttempts : 1;
  const safeTimeoutMs = Number.isInteger(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS;
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");

  return {
    async scrape(url) {
      for (let attempt = 1; attempt <= safeMaxAttempts; attempt += 1) {
        const timeout = createTimeoutSignal(safeTimeoutMs);

        try {
          const response = await fetchFn(`${normalizedBaseUrl}/scrape`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              url,
              formats: ["markdown", "html"]
            }),
            signal: timeout.signal
          });

          const body = await parseResponseBody(response, url);

          if (!response.ok) {
            const message = getErrorMessage(response.status, body);
            const transient = isTransientStatus(response.status);
            const errorFactory = transient ? createTransientScrapeError : createPermanentScrapeError;
            throw errorFactory(message, { url, status: response.status, body });
          }

          const rawContent = getRawContentFromFirecrawlBody(body);
          if (!rawContent) {
            throw createPermanentScrapeError("Firecrawl returned empty content.", {
              url,
              status: response.status
            });
          }

          return {
            rawContent,
            contentType: "text/markdown"
          };
        } catch (error) {
          const wasTimeout = error?.name === "AbortError";
          const transientError = wasTimeout || error?.isTransient === true;

          const wrappedError = wasTimeout
            ? createTransientScrapeError(
                `Firecrawl request timed out after ${safeTimeoutMs}ms.`,
                { url, timeoutMs: safeTimeoutMs },
                error
              )
            : error;

          logger.error("firecrawl scrape attempt failed", {
            url,
            attempt,
            maxAttempts: safeMaxAttempts,
            transient: transientError,
            error: wrappedError.message
          });

          if (!transientError || attempt >= safeMaxAttempts) {
            throw wrappedError;
          }

          await sleep(Math.min(1_000 * attempt, 3_000));
        } finally {
          timeout.clear();
        }
      }

      throw createTransientScrapeError("Firecrawl scrape failed after maximum retry attempts.", {
        url,
        maxAttempts: safeMaxAttempts
      });
    }
  };
}

