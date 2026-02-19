# Implementation Backlog (90-Day MVP)

Status labels:
- TODO
- IN_PROGRESS
- DONE

## Epic 0: Foundation and project bootstrap

### SG-001 - Initialize runtime and config shell
Status: DONE
Owner: Clayton
Acceptance criteria:
- App starts with environment validation
- Config supports: DB, Firecrawl API key, email provider, schedule interval
- Health endpoint or basic health command is available

### SG-002 - Define coding conventions and quality gates
Status: DONE
Owner: Clayton
Acceptance criteria:
- Lint and test commands documented
- PR checklist includes MVP scope guardrails
- CI runs lint + unit tests

## Epic 1: Data model and persistence

### SG-010 - Create MVP database schema
Status: DONE
Owner: Clayton
Acceptance criteria:
- Tables `monitored_url`, `snapshot`, `change_event` created
- Indexes on `monitored_url.url`, `snapshot.monitored_url_id+scraped_at`, `snapshot.content_hash`
- Migration can run idempotently in dev

### SG-011 - Repository layer for core entities
Status: DONE
Owner: Clayton
Acceptance criteria:
- CRUD for monitored URLs
- Insert/get latest snapshots by URL
- Insert/update change events including `notified_at`

## Epic 2: Scraping and normalization

### SG-020 - Define `ScrapeProvider` contract
Status: TODO
Owner: Clayton
Acceptance criteria:
- Interface supports scraping by URL and returns canonical content payload
- Error model distinguishes transient vs permanent failures

### SG-021 - Implement `FirecrawlScrapeProvider`
Status: TODO
Owner: Clayton
Acceptance criteria:
- Pulls page content for configured URL set
- Handles provider timeout/retry with capped attempts
- Emits structured logs for failures

### SG-022 - Implement `Normalizer`
Status: TODO
Owner: Clayton
Acceptance criteria:
- Normalizes whitespace/boilerplate consistently
- Deterministic output for same input
- Unit tests include edge cases (empty, noisy markup)

## Epic 3: Change detection and relevance

### SG-030 - Implement `HashService` (SHA-256)
Status: TODO
Owner: Clayton
Acceptance criteria:
- Generates stable hash for normalized content
- Unit tests validate deterministic behavior

### SG-031 - Implement `ChangeDetector`
Status: TODO
Owner: Clayton
Acceptance criteria:
- Detects changed vs unchanged snapshots using hash
- Captures previous/current snapshot linkage for events

### SG-032 - Implement `RelevanceHeuristic`
Status: TODO
Owner: Clayton
Acceptance criteria:
- Score uses delta size + keyword hit + URL priority
- Outputs risk class low/medium/high with thresholds
- Thresholds are configurable

## Epic 4: Notification content and delivery

### SG-040 - Implement `DiffSummaryService`
Status: TODO
Owner: Clayton
Acceptance criteria:
- Produces concise summary of meaningful changes
- Includes business impact and recommended action template
- Avoids sending raw noisy diff in email body

### SG-041 - Implement `EmailService`
Status: TODO
Owner: Clayton
Acceptance criteria:
- Sends email for relevant changes only
- Retries transient delivery failures
- Records `notified_at` on success

## Epic 5: Orchestration and scheduling

### SG-050 - Implement `SnapshotPipeline`
Status: DONE
Owner: Clayton
Acceptance criteria:
- Executes full flow for each active URL
- Persists snapshots for every run
- Creates `change_event` only for changed relevant items

### SG-051 - Add periodic scheduler
Status: TODO
Owner: Clayton
Acceptance criteria:
- Runs pipeline on configured interval
- Prevents overlapping runs
- Emits run-level metrics/logs

## Epic 6: Operations, quality, and MVP readiness

### SG-060 - Observability baseline
Status: TODO
Owner: Clayton
Acceptance criteria:
- Structured logs with correlation/run id
- Metrics: runs, failures, relevant changes, emails sent

### SG-061 - Integration test for end-to-end happy path
Status: TODO
Owner: Clayton
Acceptance criteria:
- Test covers scrape -> snapshot -> detect -> event -> notify
- Mocks external providers (Firecrawl, email)

### SG-062 - Pilot runbook and manual audit SOP
Status: TODO
Owner: Clayton
Acceptance criteria:
- Documented incident handling and replay process
- Manual audit checklist executable in <30 minutes/report

## Commercial workstream (parallel)

### SG-070 - Seller discovery interviews (10)
Status: TODO
Owner: Clayton
Acceptance criteria:
- 10 interviews completed
- Top 5 risk pain points documented

### SG-071 - Deliver 3 manual audits
Status: TODO
Owner: Clayton
Acceptance criteria:
- 3 audit reports delivered
- Feedback loop integrated into heuristic thresholds

### SG-072 - Convert first recurring paying customer
Status: TODO
Owner: Clayton
Acceptance criteria:
- One monthly payment received
- Retention follow-up plan defined

## Suggested implementation order
1. SG-001, SG-010, SG-011
2. SG-020, SG-021, SG-022
3. SG-030, SG-031, SG-032
4. SG-040, SG-041
5. SG-050, SG-051
6. SG-060, SG-061, SG-062
7. SG-070, SG-071, SG-072 (ongoing in parallel)

