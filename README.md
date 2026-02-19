# SellerGuard

MVP to monitor Mercado Livre policy changes, classify operational risk, and send business-context alerts.

## MVP Goal (90 days)
- Deliver a functional paid MVP
- Get at least 1 recurring paying customer

## Scope (frozen)
- Fixed monitored URLs
- Periodic scraping
- Snapshot persistence
- Hash-based change detection
- Basic relevance heuristic
- Email alerts for relevant changes

## Out of scope (MVP)
- Auth/user management
- Multitenancy
- Billing automation
- Complex dashboard UI
- Advanced AI classification
- Microservices

## Runtime (SG-001)

### Requirements
- Node.js 20+

### Environment variables
Copy `.env.example` to `.env` (or set variables in your shell):
- `APP_PORT` (optional, default: `3000`)
- `SCHEDULE_INTERVAL_MINUTES` (required, positive integer)
- `DB_DRIVER` (optional, `pg` default, accepts `pg` or `pg-mem`)
- `DATABASE_URL` (required only when `DB_DRIVER=pg`)
- `FIRECRAWL_API_KEY` (required)
- `EMAIL_PROVIDER` (required)

### Run
```bash
npm start
```

### Run with in-memory Postgres (`pg-mem`)
```bash
npm run dev:mem
```

### Database migration (SG-010)
```bash
npm run db:migrate
```
Notes:
- Requires `DATABASE_URL` only when `DB_DRIVER=pg`
- Safe to run multiple times in development (idempotent)

### Health endpoint
```bash
GET /health
```
Expected response contains `status: "ok"` and current timestamp.

## Quality (SG-002)

### Lint
```bash
npm run lint
```

### Unit tests
```bash
npm run test:unit
```

### Integration tests
```bash
npm run test:integration
```

### All tests
```bash
npm test
```

### PR checklist
See `docs/pr-checklist.md`.

### Test-first guideline
See `docs/testing-guidelines.md`.

## Project layout
- `docs/`: scope, architecture, backlog
- `src/`: application code
- `tests/`: unit + integration tests
- `scripts/`: local automation scripts

## Next step
Use `docs/backlog.md` as the execution source of truth.
