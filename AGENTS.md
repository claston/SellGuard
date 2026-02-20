# AGENTS

## Git Execution Policy (Mandatory)

All Git operations must be executed sequentially to avoid race conditions.

Required order:
1. `git status`
2. `git add ...`
3. `git commit ...`
4. `git push ...`
5. `gh pr create ...` (or equivalent)

Rules:
- Never run `commit`, `push`, and `pr create` in parallel.
- Never combine dependent Git steps into parallel tool calls.
- Before `push`, confirm the commit exists locally (`git log -n 1`).
- Before opening PR, confirm branch diff vs base (`git log origin/main..HEAD`).

## Delivery Flow (Mandatory)

For each task:
1. Create dedicated branch from `main`
2. Write/update tests first (TDD)
3. Implement minimal code to pass
4. Run tests
5. Commit
6. Push
7. Open PR

