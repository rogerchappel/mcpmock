import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

  it.each(["0", "-1", "NaN", "Infinity"])(
    "rejects invalid replay speed %s with a CLI error",
    (speed) => {
      const result = spawnSync(
        "npx",
        ["tsx", "src/cli.ts", "replay", "unused.jsonl", "--speed", speed],
        { cwd: process.cwd(), encoding: "utf8" }
      );

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("Playback speed must be a positive finite number");
    }
  );

  it.each(["abc", "1.5", "0", "-1", "9"])(
    "rejects invalid generate count %s with a CLI error",
    (count) => {
      const output = join(mkdtempSync(join(tmpdir(), "mcpmock-count-")), "catalog.json");
      const result = spawnSync(
        "npx",
        ["tsx", "src/cli.ts", "generate", output, "--count", count],
        { cwd: process.cwd(), encoding: "utf8" }
      );

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("Tool count must be an integer from 1 to 8");
    }
  );

  it("generates a deterministic catalog for a valid count", () => {
    const output = join(mkdtempSync(join(tmpdir(), "mcpmock-count-")), "catalog.json");
    const result = spawnSync(
      "npx",
      ["tsx", "src/cli.ts", "generate", output, "--count", "3"],
      { cwd: process.cwd(), encoding: "utf8" }
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Generated 3 tools");
    expect(JSON.parse(readFileSync(output, "utf8")).tools.map((tool: { name: string }) => tool.name))
      .toEqual(["weather", "date_time", "calculator"]);
  });
});

// Integration tests for the CLI are handled in runner.test.ts via direct module calls.
