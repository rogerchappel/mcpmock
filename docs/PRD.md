# MCPMock PRD

Status: in-progress
Decision: selected for factory build on 2026-05-23

## One-liner

MCPMock generates fixture-backed mock MCP tool catalogs and call transcripts so developers can test agent integrations without touching real services.

## Problem

MCP servers expose powerful tools, but tests for agent integrations often drift toward live credentials or hand-written mocks. Developers need a small local way to define tools, sample arguments, and deterministic responses.

## Users

- MCP server/client developers
- Agent builders testing tool-selection flows
- Maintainers writing safe demos without real credentials

## V1 Scope

- Read a simple YAML or JSON mock catalog describing tools, schemas, and responses.
- Validate catalog shape.
- Print MCP-style tool listings and deterministic call responses.
- Record a transcript from scripted calls.
- Include fixtures, tests, and a CLI smoke run.

## Non-goals

- Full MCP server implementation.
- Network transport.
- Secret handling or live API calls.

## CLI Sketch

    mcpmock validate fixtures/catalog.yml
    mcpmock tools fixtures/catalog.yml --format json
    mcpmock call fixtures/catalog.yml search '{"query":"demo"}'
    mcpmock replay fixtures/transcript.json

## Differentiation

MCPMock is deliberately boring: plain files in, deterministic tool behavior out. That makes it useful for local CI and agent tests where hidden network calls are unacceptable.

## Source attribution

Inspired by the Model Context Protocol tool concept documentation:
https://modelcontextprotocol.io/docs/concepts/tools

