# AGENTS.md - mcpmock

## Project Rules
- No breaking changes without major version bump
- Keep deterministic: same inputs → same outputs, always
- No network calls in tests or fixtures

## Testing
- `pnpm test` runs vitest
- `bash scripts/validate.sh` runs all gates
- Add tests for new commands
- Fixtures live in `fixtures/`
