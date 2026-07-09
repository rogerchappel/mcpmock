import { execFileSync } from "node:child_process";
import { describe, it, expect } from "vitest";

describe("CLI smoke", () => {
  it("shows help text from the TypeScript entrypoint", () => {
    const output = execFileSync("npx", ["tsx", "src/cli.ts", "--help"], {
      cwd: process.cwd(),
      encoding: "utf8",
    });

    expect(output).toContain("Usage: mcpmock");
    expect(output).toContain("validate");
    expect(output).toContain("call");
  });

  it("validates the bundled catalog fixture", () => {
    const output = execFileSync(
      "npx",
      ["tsx", "src/cli.ts", "validate", "fixtures/catalog.json"],
      { cwd: process.cwd(), encoding: "utf8" }
    );

    expect(output).toContain("Catalog is valid");
  });
});

// Integration tests for the CLI are handled in runner.test.ts via direct module calls.
