# MCPMock

> Fixture-backed mock MCP tool catalogs for deterministic agent testing 🎭

**Test your agent integrations without touching real services.**

MCPMock generates mock MCP tool catalogs and call transcripts so developers can test agent integrations, validate schemas, and replay interactions — all locally, all deterministic.

## Why?

Building AI agents that use MCP tools means integration testing. But real services are:
- **Slow** — network calls, rate limits, downtime
- **Expensive** — API costs add up during development
- **Non-deterministic** — different results each time = flaky tests

MCPMock gives you a local fixture-backed mock server where **the same inputs always produce the same outputs**. Write your tests once, run them forever.

## Installation

```bash
npm install -g mcpmock
# or
npx mcpmock --help
```

## Quick Start

### 1. Create a catalog

```json
// my-tools.json
{
  "tools": [
    {
      "name": "search",
      "description": "Search the knowledge base",
      "inputSchema": {
        "type": "object",
        "properties": {
          "query": { "type": "string" }
        },
        "required": ["query"]
      },
      "responses": {
        "default": {
          "content": [
            { "type": "text", "text": "Found 3 results for {query} 📚" }
          ]
        },
        "variants": {
          "empty": {
            "content": [
              { "type": "text", "text": "No results found for \"{query}\"" }
            ]
          }
        }
      }
    }
  ]
}
```

### 2. Validate it

```bash
mcpmock validate my-tools.json
✓ Catalog is valid: 1 tool(s) defined
```

### 3. List tools

```bash
mcpmock tools my-tools.json
search — Search the knowledge base

# Or get JSON
mcpmock tools my-tools.json --format json
```

### 4. Call a tool

```bash
mcpmock call my-tools.json search '{"query": "typescript patterns"}'
{
  "content": [
    { "type": "text", "text": "Found 3 results for typescript patterns 📚" }
  ]
}
```

### 5. Replay a transcript

Record calls and replay them deterministically:

```bash
mcpmock call my-tools.json search '{"query": "hello"}' --record
mcpmock replay transcript.jsonl
```

## CLI Reference

### `mcpmock validate <catalog>`

Validate a mock catalog against the schema.

```bash
mcpmock validate catalog.json       # text output
mcpmock validate catalog.json -o    # output validated schema
```

### `mcpmock tools <catalog>`

List all tools defined in a catalog.

```bash
mcpmock tools catalog.json              # text output (default)
mcpmock tools catalog.json --format json  # JSON output
```

### `mcpmock call <catalog> <tool-name> <args-json>`

Call a mock tool and get a deterministic response.

```bash
mcpmock call catalog.json search '{"query": "test"}'
mcpmock call catalog.json search '{"query": "test"}' --variant empty
mcpmock call catalog.json search '{"query": "test"}' --record
mcpmock call catalog.json search '{"query": "test"}' --record --output transcript.jsonl
```

### `mcpmock replay <transcript>`

Replay a recorded transcript with timing simulation.

```bash
mcpmock replay transcript.jsonl          # with default timing
mcpmock replay transcript.jsonl --fast   # skip delays
mcpmock replay transcript.jsonl --speed 2  # 2x faster
```

## Catalog Format

A catalog is a JSON file with a `tools` array. Each tool has:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Unique tool identifier |
| `description` | string | ✅ | Human-readable description |
| `inputSchema` | object | ✅ | JSON Schema for input validation |
| `responses` | object | ✅ | Response templates |
| `responses.default` | object | ✅ | Default response with `content` array |
| `responses.variants` | object | ❌ | Named variant responses |

### Template Substitution

Response text supports `{propertyName}` substitution from input args:

```json
{
  "content": [{ "type": "text", "text": "Hello, {name}!" }]
}
```

## Transcript Format

Transcripts are newline-delimited JSON records:

```jsonl
{"timestamp": 1716489600000, "tool": "search", "args": {"query": "hello"}, "result": {"content": [...]}, "variant": "default", "latencyMs": 42}
```

## Orchestration

MCPMock supports full conversation orchestration. See [docs/ORCHESTRATION.md](./docs/ORCHESTRATION.md) for multi-tool workflows and state machine patterns.

## Development

```bash
npm install
npm run build
npm test
npm run smoke
```

## Package contents

The npm package allowlist includes the built runtime files plus the public support
documents needed for release review: `README.md`, `LICENSE`, `SECURITY.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `RELEASE_NOTES.md`.
Run `npm run package:smoke` or `npm pack --dry-run` before publishing to
confirm those files are still present in the tarball.

## License

MIT

### Generated Catalog Example

```json
{
  "name": "generated-catalog",
  "description": "Generated mock catalog with 3 tools",
  "tools": [
    {
      "name": "weather",
      "description": "Get current weather conditions for a location",
      "inputSchema": {
        "type": "object",
        "properties": {
          "location": { "type": "string" },
          "units": { "type": "string", "enum": ["metric", "imperial"] }
        },
        "required": ["location"]
      },
      "responses": {
        "default": {
          "content": [{"type": "text", "text": "Mock response from weather"}]
        }
      }
    }
  ]
}
```

Run the release-readiness checks that match this package before publishing or opening a release PR.

- `npm run lint` - run lint rules
- `npm run check` - type-check the TypeScript sources
- `npm test` - run the Vitest suite
- `npm run smoke` - exercise the built CLI against fixtures
- `npm run package:smoke` - build and dry-run the npm tarball
- `npm run release:check` - run the full local release gate

## Release readiness

Run the release gate before tagging or publishing:

```sh
pnpm run release:check
pnpm pack --dry-run
```

The package smoke check prints the tarball contents so missing runtime files are caught before release.
