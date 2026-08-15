# Changelog

## [0.2.0] - 2026-08-15

### Added
- Transcript replay timing with deterministic delay coverage
- Executable documentation smoke tests for the documented CLI workflows
- Strict CLI validation for output formats, JSON arguments, generated tool counts, and catalog response content
- npm trusted publishing with provenance and a release-order regression check
- A release-readiness guard that requires the package version to exceed npm's published version and fails closed when the registry is unavailable

### Fixed
- Prevent transcript recording from overwriting its source catalog
- Resolve audited transitive dependency versions and keep the npm lockfile current

### Changed
- Align release automation and contributor documentation on deterministic npm installs and verification

## [0.1.2] - 2026-07-23

### Fixed
- Correct the scoped npm package identity and verify installation from the packed artifact
- Ship an executable `mcpmock` package binary and validate its CLI metadata

## [0.1.1] - 2026-06-12

### Added
- Package support documentation and reusable release-readiness checks
- Packed-artifact smoke coverage for the published runtime files

### Changed
- Standardize release checks on the committed npm lockfile

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
