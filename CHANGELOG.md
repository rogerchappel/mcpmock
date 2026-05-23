# Changelog

## [0.1.0] - 2026-05-23

### Added
- CLI with `validate`, `tools`, `call`, `replay`, `generate` commands
- Catalog loading from JSON files
- Catalog validation with error paths
- Template substitution in responses (`{propertyName}` syntax)
- Tool call runner with variant support
- Transcript recording and replay (JSONL format)
- Orchestration engine for multi-step agent flows
- Catalog generator with 8 sample tool templates
- Fixture catalogs (sample, minimal, invalid, empty)
- Test suite (57 tests across 7 test files)
- Smoke test and validation scripts
- GitHub Actions CI workflow
- Branch protection and release workflows

### Fixed
- TypeScript `exactOptionalPropertyTypes` compatibility
- Lint configuration for flat config ESLint
