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

MCPMock is not yet published to the npm registry. Until the first release is
published, run it from a checkout:

```bash
git clone https://github.com/rogerchappel/mcpmock.git
cd mcpmock
npm ci
npm run build
node dist/cli.js --help
```

You can also build the same tarball that will be published and invoke its CLI
without installing it globally:

```bash
npm pack
npx --yes --package ./rogerchappel-mcpmock-0.2.0.tgz mcpmock --help
```

After the package is published to npm, these registry commands will work:

```bash
npm install -g @rogerchappel/mcpmock
# or
npx --package @rogerchappel/mcpmock mcpmock --help
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

Validation checks every default and variant response. Content blocks must be `text` with string `text`, `image` with string `data` and `mimeType`, or `resource` with a string `uri`; optional response `isError` values must be boolean.

```bash
mcpmock validate fixtures/catalog.json          # basic catalog validation
mcpmock validate fixtures/catalog.json --strict # strict input-schema validation
```

### `mcpmock tools <catalog>`

List all tools defined in a catalog.

```bash
mcpmock tools fixtures/catalog.json               # text output (default)
mcpmock tools fixtures/catalog.json --format json # JSON output
```

`--format` accepts `text` or `json`. Other values are rejected with a nonzero exit status.

### `mcpmock call <catalog> <tool-name> <args-json>`

Call a mock tool and get a deterministic response.

```bash
mcpmock call fixtures/catalog.json search '{"query": "test"}'
mcpmock call fixtures/catalog.json search '{"query": "test"}' --variant empty
mcpmock call fixtures/catalog.json search '{"query": "test"}' --record
mcpmock call fixtures/catalog.json search '{"query": "test"}' --record --output transcript.jsonl
```

The transcript output must be a different file from the input catalog. Equivalent relative and
absolute paths are rejected before recording so the catalog cannot be overwritten or appended to.
The optional `<args-json>` value must be a JSON object. Malformed JSON and other JSON values such
as arrays, strings, numbers, booleans, or `null` are reported as concise CLI errors without running
the tool.

### `mcpmock replay <transcript>`

Replay a recorded transcript with timing simulation.

```bash
mcpmock replay fixtures/transcript.jsonl           # with recorded timing
mcpmock replay fixtures/transcript.jsonl --fast    # skip delays
mcpmock replay fixtures/transcript.jsonl --speed 2 # 2x faster
```

Each entry is printed, then replay waits for that entry's recorded `latencyMs`
before printing the next entry. `--speed` divides those delays by a positive
finite multiplier; `--fast` skips them entirely.

### Input errors

Expected input failures exit nonzero with one concise diagnostic on stderr and
no Node.js stack trace. This includes missing or malformed catalog JSON,
malformed call argument JSON, and missing or malformed transcript JSONL:

```text
$ mcpmock validate missing.json
error: File not found: /path/to/missing.json
```

A failed call does not create or append a transcript, even with `--record`.

### `mcpmock generate [output]`

Generate a deterministic catalog containing 1 to 8 sample tools (5 by default).
The count must be a whole number within that range.

```bash
mcpmock generate my-tools.json --count 3
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
| `responses.default.content` | array | ✅ | One or more content items returned by default |
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

## Agent Skill

This repository includes [SKILL.md](./SKILL.md) for agents that need a repeatable local workflow for MCP-style fixture catalogs, deterministic tool calls, and transcript replay. The skill keeps external action boundaries explicit: MCPMock reads local fixtures by default and only writes transcripts when `--record --output <file>` is provided.

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

## Limitations

- MCPMock validates and replays local mock catalogs; it is not a compliance verifier for real MCP servers.
- Recorded transcripts may contain sensitive fixture data, so review them before committing or sharing.
- Timing simulation is deterministic test scaffolding and should not be treated as a production latency model.

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
- `npm run audit` - fail on high-severity vulnerabilities in the dependency tree
- `npm run check` - type-check the TypeScript sources
- `npm test` - run the Vitest suite
- `npm run smoke` - exercise the built CLI against fixtures
- `npm run package:smoke` - build and dry-run the npm tarball
- `npm run release:check` - run the full local release gate

## Release readiness

Run the release gate before tagging or publishing:

```sh
npm ci
npm run release:check
npm pack --dry-run
```

The repository uses npm and `package-lock.json` for deterministic installs. The
release gate also checks that CI and release workflows retain that configuration,
that ReleaseBox enables npm publishing, and that the tag workflow publishes with
npm provenance before creating the GitHub release.

Releases use npm trusted publishing rather than a long-lived npm token. Before
tagging, configure `rogerchappel/mcpmock` in npm as a trusted publisher for the
`release.yml` workflow. Push a tag that exactly matches the package version (for
example, package version `0.1.0` uses tag `v0.1.0`). The workflow validates the
tag, runs the complete release gate, publishes `@rogerchappel/mcpmock`, and only
then creates the GitHub release.

The package smoke check prints the tarball contents so missing runtime files are caught before release.
