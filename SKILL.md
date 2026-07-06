# MCPMock Agent Skill

Use this skill when an agent integration needs deterministic MCP-like tool fixtures without calling live services. It is best for testing tool selection, scripted call flows, demo catalogs, and transcript replay in local CI.

## Inputs

- A JSON mock catalog with a `tools` array.
- Optional scripted arguments for `mcpmock call`.
- Optional JSONL transcript files for replay.

## Required Tools

- Node.js 18 or newer.
- The local `mcpmock` CLI from this repository.
- No network access, credentials, or live MCP server is required.

## Side-Effect Boundaries

- `validate`, `tools`, `call`, and `replay` read local fixture files.
- `call --record --output <file>` writes only the explicit transcript path.
- Do not point MCPMock at private production data unless the transcript is approved for storage.
- Do not use MCPMock output as proof that a real remote MCP server is authorized or reachable.

## Workflow

1. Create or select a catalog fixture.
2. Run `mcpmock validate <catalog>`.
3. Run `mcpmock tools <catalog> --format json` to inspect the tool surface.
4. Run `mcpmock call <catalog> <tool-name> '<args-json>'` for deterministic responses.
5. Record calls with `--record --output <transcript.jsonl>` only when a persistent fixture is intended.
6. Replay the transcript with `mcpmock replay <transcript.jsonl> --fast`.

## Examples

```bash
mcpmock validate fixtures/catalog.json
mcpmock tools fixtures/catalog.json --format json
mcpmock call fixtures/catalog.json search '{"query":"release notes"}'
mcpmock call fixtures/catalog.json search '{"query":"release notes"}' --record --output tmp/transcript.jsonl
mcpmock replay tmp/transcript.jsonl --fast
```

## Verification

Before recommending or packaging changes, run:

```bash
npm run check
npm test
npm run build
npm run smoke
bash scripts/validate.sh
```

For release review, also run:

```bash
npm run package:smoke
```

