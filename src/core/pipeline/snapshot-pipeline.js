import { isContentChanged } from "../services/change-detector.js";
import { summarizeChange } from "../services/diff-summary-service.js";
import { hashSha256 } from "../services/hash-service.js";
import { normalizeContent } from "../services/normalizer.js";
import { scoreRelevance } from "../services/relevance-heuristic.js";
import { toCanonicalScrapePayload } from "../../providers/scrape-provider.js";

export function createSnapshotPipeline({
  repositories,
  scrapeProvider,
  emailService = null,
  normalizer = normalizeContent,
  hashService = hashSha256,
  changeDetector = isContentChanged,
  relevanceHeuristic = scoreRelevance,
  diffSummaryService = summarizeChange
}) {
  return {
    async runOnce() {
      const activeUrls = await repositories.monitoredUrls.listActive();
      let persistedSnapshots = 0;
      let createdChangeEvents = 0;

      for (const monitoredUrl of activeUrls) {
        const previousSnapshot = await repositories.snapshots.getLatestByMonitoredUrlId(
          monitoredUrl.id
        );
        const scrapeResult = await scrapeProvider.scrape(monitoredUrl.url);
        const canonicalPayload = toCanonicalScrapePayload(monitoredUrl.url, scrapeResult);
        const rawContent = canonicalPayload.rawContent;
        const normalizedContent = normalizer(rawContent);
        const contentHash = hashService(normalizedContent);

        const currentSnapshot = await repositories.snapshots.insert({
          monitoredUrlId: monitoredUrl.id,
          rawContent,
          normalizedContent,
          contentHash,
          scrapedAt: new Date().toISOString()
        });
        persistedSnapshots += 1;

        const changed = changeDetector(previousSnapshot, contentHash);
        if (!changed) {
          continue;
        }

        const relevance = relevanceHeuristic({
          monitoredUrl,
          previousContent: previousSnapshot?.normalizedContent || "",
          currentContent: normalizedContent
        });

        if (!relevance.isRelevant) {
          continue;
        }

        const summary = diffSummaryService({
          monitoredUrl,
          previousSnapshot,
          currentSnapshot,
          relevance
        });

        const changeEvent = await repositories.changeEvents.insert({
          monitoredUrlId: monitoredUrl.id,
          previousSnapshotId: previousSnapshot?.id ?? null,
          currentSnapshotId: currentSnapshot.id,
          riskLevel: relevance.riskLevel,
          relevanceScore: relevance.score,
          summary: summary.summary,
          businessImpact: summary.businessImpact,
          recommendation: summary.recommendation
        });
        createdChangeEvents += 1;

        if (emailService?.sendChangeAlert) {
          await emailService.sendChangeAlert({
            monitoredUrl,
            changeEvent
          });
          await repositories.changeEvents.markNotified(changeEvent.id, new Date().toISOString());
        }
      }

      return {
        processedUrls: activeUrls.length,
        persistedSnapshots,
        createdChangeEvents
      };
    }
  };
}
