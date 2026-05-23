import { describe, it, expect } from "vitest";
import { executeScript, loadOrchestration, type OrchestrationScript } from "../orchestrator.js";
import type { MockCatalog } from "../types.js";

const catalog: MockCatalog = {
  tools: [
    {
      name: "search",
      description: "Search",
      inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
      responses: { default: { content: [{ type: "text", text: "Results for {query}" }] } },
    },
    {
      name: "echo",
      description: "Echo",
      inputSchema: { type: "object", properties: { message: { type: "string" } }, required: ["message"] },
      responses: { default: { content: [{ type: "text", text: "Echo: {message}" }] } },
    },
  ],
};

const script: OrchestrationScript = {
  name: "test-flow",
  vars: { query: "hello" },
  steps: [
    { tool: "search", args: { query: "${query}" }, storeAs: "results" },
    { tool: "echo", args: { message: "done" } },
  ],
};

describe("executeScript", () => {
  it("executes all steps in sequence", () => {
    const result = executeScript(catalog, script);
    expect(result.success).toBe(true);
    expect(result.stepsExecuted).toBe(2);
    expect(result.transcript).toHaveLength(2);
  });

  it("resolves variable references in args", () => {
    const result = executeScript(catalog, script);
    expect(result.transcript[0].tool).toBe("search");
    expect(result.transcript[0].result.content[0].text).toBe("Results for hello");
  });

  it("stores results in vars when storeAs is set", () => {
    const result = executeScript(catalog, script);
    expect(result.vars.results).toBe("Results for hello");
  });

  it("reports final vars correctly", () => {
    const result = executeScript(catalog, script);
    expect(result.vars.query).toBe("hello");
    expect(result.vars.results).toBe("Results for hello");
  });

  it("handles unknown tool gracefully", () => {
    const badScript: OrchestrationScript = {
      name: "bad",
      steps: [{ tool: "nope", args: {} }],
    };
    const result = executeScript(catalog, badScript);
    expect(result.success).toBe(true);
    expect(result.transcript[0].result.isError).toBe(true);
  });
});

describe("loadOrchestration", () => {
  it("loads an orchestration file from fixtures", () => {
    const s = loadOrchestration("fixtures/orchestration.json");
    expect(s.name).toBe("transcript-sample");
    expect(s.steps).toHaveLength(3);
    expect(s.steps[0].tool).toBe("search");
  });
});
