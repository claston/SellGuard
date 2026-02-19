# Architecture (MVP)

## Principles
- Monolithic, minimal architecture
- Provider-agnostic scraping abstraction
- Fast iteration with operational reliability

## Core components
- `SnapshotPipeline`: orchestrates end-to-end run
- `ScrapeProvider`: interface for content acquisition
- `FirecrawlScrapeProvider`: default implementation
- `Normalizer`: stable text/content normalization
- `HashService`: SHA-256 hash generation
- `ChangeDetector`: compare current vs latest snapshot
- `RelevanceHeuristic`: delta size + keywords + URL priority
- `DiffSummaryService`: concise, operator-facing summary
- `EmailService`: notification transport

## Data model

### `monitored_url`
- `id` (PK)
- `url` (unique)
- `name`
- `priority` (low|medium|high)
- `keywords` (json/text)
- `active` (bool)
- `created_at`
- `updated_at`

### `snapshot`
- `id` (PK)
- `monitored_url_id` (FK)
- `raw_content`
- `normalized_content`
- `content_hash`
- `scraped_at`
- `created_at`

### `change_event`
- `id` (PK)
- `monitored_url_id` (FK)
- `previous_snapshot_id` (FK)
- `current_snapshot_id` (FK)
- `risk_level` (low|medium|high)
- `relevance_score` (int)
- `summary`
- `business_impact`
- `recommendation`
- `notified_at` (nullable)
- `created_at`

## Pipeline flow
1. Load active monitored URLs
2. Scrape content via `ScrapeProvider`
3. Normalize content
4. Compute SHA-256 hash
5. Save snapshot
6. Compare against previous snapshot
7. If changed, score relevance
8. If relevant, generate summary + business context
9. Persist `change_event`
10. Send email notification

## Deployment posture (MVP)
- Single process/app
- Scheduled job/cron for periodic runs
- Managed DB
- Email provider via SMTP/API
- Firecrawl Cloud API as external dependency
