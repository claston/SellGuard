import { loadConfig } from "./config/env.js";
import { createRuntime } from "./runtime.js";

async function main() {
  const config = loadConfig();
  const runtime = createRuntime({
    config,
    scrapeProvider: {
      async scrape(url) {
        throw new Error(
          `No scrape provider configured for URL: ${url}. Integrate SG-021 provider in runtime wiring.`
        );
      }
    }
  });

  await runtime.start();
}

main();
