# mcpmock Orchestration Guide

MCPMock can execute multi-step conversation scripts against a mock catalog, enabling deterministic testing of agent workflows without live services.

## What is Orchestration?

An orchestration script defines a sequence of tool calls, variable propagation, and conditional branching. It lets you simulate how an agent would interact with multiple MCP tools over a conversation.

## Orchestration File Format

```json
{
  "name": "my-workflow",
  "description": "A multi-step agent workflow",
  "vars": { "query": "initial value" },
  "steps": [
    {
      "tool": "search",
      "args": { "query": "${query}" },
      "storeAs": "results"
    },
    {
      "tool": "read_file",
      "args": { "path": "./docs/results.txt" },
      "storeAs": "content",
      "on": {
        "isError": "fallback",
        "hasResults": "process"
      }
    }
  ]
}
```

### Fields

| Field | Description |
|-------|-------------|
| `name` | Script identifier |
| `description` | Optional description |
| `vars` | Initial variable scope |
| `steps` | Ordered tool calls |

### Step Fields

| Field | Description |
|-------|-------------|
| `tool` | Tool name to call |
| `args` | Arguments (supports `${var}` references) |
| `storeAs` | Store result text in variable scope |
| `next` | Label for next step |
| `on` | Conditional branching map |
| `variant` | Response variant to use |

### Conditions

| Condition | Matches when |
|-----------|-------------|
| `isError` | Response has `isError: true` |
| `isEmpty` | Response has empty text content |
| `hasResults` | Response text contains "result" or "found" |
| any other text | Response text contains the condition string |

### Variable Substitution

Use `${varName}` in args to reference variables from the current scope:

```json
{
  "args": { "query": "${query}" }
}
```

When a step uses `storeAs`, the response text is stored in scope for later steps.

## Using Programmatically

```typescript
import { loadCatalog } from "./catalog.js";
import { loadOrchestration, executeScript } from "./orchestrator.js";

const catalog = loadCatalog("fixtures/catalog.json");
const script = loadOrchestration("fixtures/orchestration.json");
const result = executeScript(catalog, script);

console.log(result.success);        // boolean
console.log(result.stepsExecuted);  // count
console.log(result.transcript);     // full transcript
console.log(result.vars);           // final variable scope
```

## Example: Multi-Tool Workflow

```json
{
  "name": "search-and-read",
  "vars": { "query": "typescript" },
  "steps": [
    {
      "tool": "search",
      "args": { "query": "${query}" },
      "storeAs": "results"
    },
    {
      "tool": "read_file",
      "args": { "path": "./src/results.txt" },
      "storeAs": "content"
    },
    {
      "tool": "create_file",
      "args": {
        "path": "./output/summary.txt",
        "content": "Results for ${query}: ${results}"
      }
    }
  ]
}
```

## Best Practices

- Keep scripts focused on one workflow per file
- Use descriptive step names and variable names
- Test scripts with multiple fixtures to verify determinism
- Include error branches for realistic agent behavior
