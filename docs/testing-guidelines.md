# Testing Guidelines

## Default approach
- Follow test-first for backlog work (red -> green -> refactor).
- Start each story by writing tests that express acceptance criteria.
- Run tests before implementation and keep the failing output in the PR notes.
- Implement only after tests fail for the expected reason.
- Re-run lint and all tests after implementation.

## Minimum commands
- `npm run test:unit`
- `npm run test:integration`
- `npm run lint`

## SG-011 note
- Repository behavior is validated through integration tests using `pg-mem`.
