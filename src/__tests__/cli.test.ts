import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
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

  it.each([
    ["text", "search — Search the knowledge base"],
    ["json", '"name": "search"'],
  ])("lists tools in %s format", (format, expected) => {
    const result = spawnSync(
      "npx",
      ["tsx", "src/cli.ts", "tools", "fixtures/catalog.json", "--format", format],
      { cwd: process.cwd(), encoding: "utf8" }
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(expected);
    expect(result.stderr).toBe("");
  });

  it("rejects an unsupported tools format without printing tool output", () => {
    const result = spawnSync(
      "npx",
      ["tsx", "src/cli.ts", "tools", "fixtures/catalog.json", "--format", "yaml"],
      { cwd: process.cwd(), encoding: "utf8" }
    );

    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Output format must be one of: json, text");
    expect(result.stderr).not.toContain("src/cli.ts");
  });

  it("reports malformed call arguments without a stack trace", () => {
    const result = spawnSync(
      "npx",
      ["tsx", "src/cli.ts", "call", "fixtures/catalog.json", "search", "{bad"],
      { cwd: process.cwd(), encoding: "utf8" }
    );

    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Invalid call arguments JSON");
    expect(result.stderr).not.toContain("SyntaxError");
    expect(result.stderr).not.toContain("src/cli.ts");
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

  it("rejects a transcript output that resolves to the catalog without changing it", () => {
    const directory = mkdtempSync(join(tmpdir(), "mcpmock-record-alias-"));
    const catalog = join(directory, "catalog.json");
    const original = readFileSync("fixtures/catalog.json");
    writeFileSync(catalog, original);

    const result = spawnSync(
      "npx",
      ["tsx", "src/cli.ts", "call", catalog, "search", '{"query":"test"}', "--record", "--output", join(directory, ".", "catalog.json")],
      { cwd: process.cwd(), encoding: "utf8" }
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Transcript output path must differ from the catalog path");
    expect(readFileSync(catalog)).toEqual(original);
  });

  it("appends valid JSONL when recording to a separate output", () => {
    const output = join(mkdtempSync(join(tmpdir(), "mcpmock-record-")), "transcript.jsonl");
    const args = [
      "tsx", "src/cli.ts", "call", "fixtures/catalog.json", "search",
      '{"query":"test"}', "--record", "--output", output,
    ];

    expect(spawnSync("npx", args, { cwd: process.cwd(), encoding: "utf8" }).status).toBe(0);
    expect(spawnSync("npx", args, { cwd: process.cwd(), encoding: "utf8" }).status).toBe(0);

    const entries = readFileSync(output, "utf8").trim().split("\n").map((line) => JSON.parse(line));
    expect(entries).toHaveLength(2);
    expect(entries.every((entry: { tool: string }) => entry.tool === "search")).toBe(true);
  });
});

// Integration tests for the CLI are handled in runner.test.ts via direct module calls.
