# PR Checklist

- Scope stays inside MVP boundaries in `docs/mvp-scope.md`
- No auth, multitenancy, billing, dashboards, AI classification, or microservices
- Changes are focused and minimal; no speculative refactors
- Test-first evidence included for backlog stories (failing test before implementation)
- `npm run lint` passes
- `npm test` passes
- Any new env vars are documented in `README.md` and `.env.example`
- Testing approach follows `docs/testing-guidelines.md`
