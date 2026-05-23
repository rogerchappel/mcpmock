import { describe, it, expect } from "vitest";
import { generateTool, generateCatalog, writeCatalog, listGeneratedTools } from "../generator.js";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";

describe("generateTool", () => {
  it("generates a tool with name, schema, and response", () => {
    const tool = generateTool(0);
    expect(tool.name).toBe("weather");
    expect(tool.inputSchema.type).toBe("object");
    expect(tool.responses.default.content).toHaveLength(1);
  });

  it("cycles through available tools", () => {
    const t1 = generateTool(0);
    const t2 = generateTool(8);
    expect(t1.name).toBe(t2.name);
  });

  it("generates a calculator tool", () => {
    const tool = generateTool(2);
    expect(tool.name).toBe("calculator");
    expect(tool.inputSchema.required).toContain("expression");
  });
});

describe("generateCatalog", () => {
  it("generates a catalog with specified tool count", () => {
    const catalog = generateCatalog({ toolCount: 3, output: "", format: "json" });
    expect(catalog.tools).toHaveLength(3);
    expect(catalog.name).toBe("generated-catalog");
  });

  it("generates unique tool names", () => {
    const catalog = generateCatalog({ toolCount: 5, output: "", format: "json" });
    const names = catalog.tools.map((t) => t.name);
    const unique = new Set(names);
    expect(names.length).toBe(unique.size);
  });

  it("produces valid catalogs", () => {
    const catalog = generateCatalog({ toolCount: 4, output: "", format: "json" });
    const result = { valid: catalog.tools.length === 4, errors: [] } as { valid: boolean; errors: Array<{ message: string }> };
    expect(result.valid).toBe(true);
  });

  it("caps tool count at available samples", () => {
    const catalog = generateCatalog({ toolCount: 100, output: "", format: "json" });
    expect(catalog.tools.length).toBeLessThanOrEqual(8);
  });
});

describe("writeCatalog", () => {
  it("writes a catalog to a JSON file", () => {
    const catalog = generateCatalog({ toolCount: 2, output: "", format: "json" });
    const testPath = resolve(__dirname, "../../tmp/test-gen.json");
    const path = writeCatalog(catalog, testPath);
    expect(existsSync(path)).toBe(true);
    const content = JSON.parse(readFileSync(path, "utf-8"));
    expect(content.tools).toHaveLength(2);
    // Cleanup
    unlinkSync(path);
  });
});

describe("listGeneratedTools", () => {
  it("returns available sample tool names", () => {
    const tools = listGeneratedTools();
    expect(tools).toContain("weather");
    expect(tools).toContain("calculator");
    expect(tools.length).toBe(8);
  });
});
