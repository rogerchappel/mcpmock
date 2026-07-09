import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
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

  it("prints the package version from the CLI metadata", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };
    const output = execFileSync("npx", ["tsx", "src/cli.ts", "--version"], {
      cwd: process.cwd(),
      encoding: "utf8",
    });

    expect(output.trim()).toBe(pkg.version);
  });
});

// Integration tests for the CLI are handled in runner.test.ts via direct module calls.
