import { describe, it, expect } from "vitest";
import { runCall, listTools, formatToolList } from "../runner.js";
import type { MockCatalog } from "../types.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const catalog: MockCatalog = {
  tools: [
    {
      name: "search",
      description: "Search the knowledge base",
      inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
      responses: {
        default: { content: [{ type: "text", text: "Found 3 results for {query}" }] },
        variants: {
          empty: { content: [{ type: "text", text: "No results found for {query}" }] },
          error: { content: [{ type: "text", text: "Search service unavailable" }], isError: true },
        },
      },
    },
  ],
};

describe("runCall", () => {
  it("calls a tool with default response", () => {
    const result = runCall(catalog, "search", { query: "hello" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toBe("Found 3 results for hello");
  });

  it("substitutes template variables in response", () => {
    const result = runCall(catalog, "search", { query: "typescript patterns" });
    expect(result.content[0].text).toBe("Found 3 results for typescript patterns");
  });

  it("uses variant when specified", () => {
    const result = runCall(catalog, "search", { query: "hello" }, "empty");
    expect(result.content[0].text).toBe('No results found for hello');
  });

  it("returns error for missing tool", () => {
    const result = runCall(catalog, "nonexistent", {});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("nonexistent");
  });

  it("falls back to default when variant is missing", () => {
    const result = runCall(catalog, "search", { query: "x" }, "nope");
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("x");
  });

  it("returns error variant correctly", () => {
    const result = runCall(catalog, "search", { query: "x" }, "error");
    expect(result.isError).toBe(true);
  });

  it("handles empty args", () => {
    const result = runCall(catalog, "search", {});
    expect(result.content[0].text).toBe("Found 3 results for {query}");
  });
});

describe("listTools", () => {
  it("lists all tools in the catalog", () => {
    const tools = listTools(catalog);
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe("search");
  });

  it("returns empty array for empty catalog", () => {
    const tools = listTools({ tools: [] });
    expect(tools).toHaveLength(0);
  });
});

describe("formatToolList", () => {
  it("formats tools as text", () => {
    const formatted = formatToolList([{ name: "search", description: "Find things" }]);
    expect(formatted).toBe("search — Find things");
  });

  it("joins multiple tools with newlines", () => {
    const formatted = formatToolList([
      { name: "a", description: "d1" },
      { name: "b", description: "d2" },
    ]);
    expect(formatted).toBe("a — d1\nb — d2");
  });
});

describe("fixture catalog integration", () => {
  it("runs calls against fixtures/catalog.json", () => {
    const fixturePath = resolve(__dirname, "../../fixtures/catalog.json");
    const raw = readFileSync(fixturePath, "utf-8");
    const fixtureCatalog = JSON.parse(raw) as MockCatalog;

    const result = runCall(fixtureCatalog, "search", { query: "demo" });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("demo");
  });

  it("returns error variant from fixture", () => {
    const fixturePath = resolve(__dirname, "../../fixtures/catalog.json");
    const raw = readFileSync(fixturePath, "utf-8");
    const fixtureCatalog = JSON.parse(raw) as MockCatalog;

    const result = runCall(fixtureCatalog, "search", { query: "demo" }, "error");
    expect(result.isError).toBe(true);
  });

  it("calls read_file from fixture", () => {
    const fixturePath = resolve(__dirname, "../../fixtures/catalog.json");
    const raw = readFileSync(fixturePath, "utf-8");
    const fixtureCatalog = JSON.parse(raw) as MockCatalog;

    const result = runCall(fixtureCatalog, "read_file", { path: "/etc/hosts" });
    expect(result.content[0].text).toContain("/etc/hosts");
  });

  it("calls create_file from fixture with template sub", () => {
    const fixturePath = resolve(__dirname, "../../fixtures/catalog.json");
    const raw = readFileSync(fixturePath, "utf-8");
    const fixtureCatalog = JSON.parse(raw) as MockCatalog;

    const result = runCall(fixtureCatalog, "create_file", {
      path: "/tmp/test.log",
      content: "hello",
    });
    expect(result.content[0].text).toContain("/tmp/test.log");
    expect(result.content[0].text).toContain("hello");
  });
});
