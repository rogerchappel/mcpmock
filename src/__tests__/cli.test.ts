import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

describe("CLI smoke", () => {
  const runCli = (args: string[]) =>
    spawnSync("npx", ["tsx", "src/cli.ts", ...args], {
      cwd: process.cwd(), encoding: "utf8",
    });

  const expectConciseFailure = (args: string[]) => {
    const result = runCli(args);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe("");
    expect(result.stderr).toMatch(/^error: .+\n$/);
    expect(result.stderr).not.toMatch(/\n\s+at |node:internal|node:fs:\d+/);
    return result.stderr;
  };

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

  it("rejects a catalog whose default response omits content", () => {
    const directory = mkdtempSync(join(tmpdir(), "mcpmock-invalid-catalog-"));
    const catalog = join(directory, "catalog.json");
    writeFileSync(catalog, JSON.stringify({
      tools: [{
        name: "x",
        description: "x",
        inputSchema: { type: "object" },
        responses: { default: {} },
      }],
    }));

    const result = spawnSync("npx", ["tsx", "src/cli.ts", "validate", catalog], {
      cwd: process.cwd(),
      encoding: "utf8",
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("$.tools[0].responses.default.content");
    expect(result.stderr).toContain("must be a non-empty array");
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

  it.each(["null", "[]", '"text"', "1", "true", "false"])(
    "rejects non-object call arguments %s without a stack trace",
    (argsJson) => {
      const result = spawnSync(
        "npx",
        ["tsx", "src/cli.ts", "call", "fixtures/catalog.json", "search", argsJson],
        { cwd: process.cwd(), encoding: "utf8" }
      );

      expect(result.status).not.toBe(0);
      expect(result.stdout).toBe("");
      expect(result.stderr).toContain("Invalid call arguments JSON: expected a JSON object");
      expect(result.stderr).not.toContain("TypeError");
      expect(result.stderr).not.toContain("src/cli.ts");
    }
  );

  it("accepts object call arguments and substitutes response templates", () => {
    const result = spawnSync(
      "npx",
      [
        "tsx", "src/cli.ts", "call", "fixtures/catalog.json", "search",
        '{"query":"typescript patterns"}',
      ],
      { cwd: process.cwd(), encoding: "utf8" }
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("typescript patterns");
    expect(result.stdout).not.toContain("{query}");
    expect(result.stderr).toBe("");
  });

  it("prints the package version from the CLI metadata", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };
    const output = execFileSync("npx", ["tsx", "src/cli.ts", "--version"], {
      cwd: process.cwd(),
      encoding: "utf8",
    });

    expect(output.trim()).toBe(pkg.version);
  });

  it.each(["validate", "tools", "call"])("%s reports a missing catalog concisely", (command) => {
    const missing = join(mkdtempSync(join(tmpdir(), "mcpmock-cli-")), "missing.json");
    const args = command === "call" ? [command, missing, "search"] : [command, missing];
    expect(expectConciseFailure(args)).toContain(`File not found: ${missing}`);
  });

  it("reports malformed catalog JSON consistently", () => {
    const catalog = join(mkdtempSync(join(tmpdir(), "mcpmock-cli-")), "catalog.json");
    writeFileSync(catalog, "{ not json\n");
    expect(expectConciseFailure(["validate", catalog])).toContain("Invalid JSON input");
    expect(expectConciseFailure(["tools", catalog])).toContain("Invalid JSON input");
  });

  it("does not create a transcript when call input fails", () => {
    const output = join(mkdtempSync(join(tmpdir(), "mcpmock-cli-")), "transcript.jsonl");
    expectConciseFailure(["call", "fixtures/catalog.json", "search", "{", "--record", "--output", output]);
    expect(() => readFileSync(output, "utf8")).toThrow();
  });

  it("reports missing and malformed replay transcripts concisely", () => {
    const directory = mkdtempSync(join(tmpdir(), "mcpmock-cli-"));
    const missing = join(directory, "missing.jsonl");
    const malformed = join(directory, "malformed.jsonl");
    writeFileSync(malformed, "{ not json\n");
    expect(expectConciseFailure(["replay", missing])).toContain(`File not found: ${missing}`);
    expect(expectConciseFailure(["replay", malformed])).toContain("Invalid JSON input");
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
