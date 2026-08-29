import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { newTranscript, recordEntry, replayTranscript } from "../transcript.js";

describe("newTranscript", () => {
  it("creates an entry with current timestamp", () => {
    const before = Date.now() - 100;
    const entry = newTranscript("search", { query: "test" }, { content: [{ type: "text", text: "ok" }] });
    const after = Date.now() + 100;
    expect(entry.timestamp).toBeGreaterThanOrEqual(before);
    expect(entry.timestamp).toBeLessThanOrEqual(after);
  });

  it("stores tool name and args", () => {
    const entry = newTranscript("read_file", { path: "/tmp/x" }, { content: [] });
    expect(entry.tool).toBe("read_file");
    expect(entry.args.path).toBe("/tmp/x");
  });

  it("stores variant when provided", () => {
    const entry = newTranscript("x", {}, { content: [] }, "alternative");
    expect(entry.variant).toBe("alternative");
  });

  it("defaults latency to 0", () => {
    const entry = newTranscript("x", {}, { content: [] });
    expect(entry.latencyMs).toBe(0);
  });

  it("accepts custom latency", () => {
    const entry = newTranscript("x", {}, { content: [] }, undefined, 42);
    expect(entry.latencyMs).toBe(42);
  });
});

describe("recordEntry", () => {
  it("serializes to valid JSON", () => {
    const entry = newTranscript("test", {}, { content: [{ type: "text", text: "ok" }] });
    const line = recordEntry(entry);
    const parsed = JSON.parse(line);
    expect(parsed.tool).toBe("test");
  });

  it("produces a single line", () => {
    const entry = newTranscript("x", {}, { content: [] });
    const line = recordEntry(entry);
    expect(line.split("\n")).toHaveLength(1);
  });
});

describe("replayTranscript", () => {
  const writeTranscript = (contents: string) => {
    const path = join(mkdtempSync(join(tmpdir(), "mcpmock-transcript-")), "input.jsonl");
    writeFileSync(path, contents);
    return path;
  };

  it("accepts valid entries and ignores blank lines", () => {
    const entry = recordEntry(newTranscript("search", {}, { content: [] }, undefined, 5));
    expect(replayTranscript(writeTranscript(`\n${entry}\n\n`))).toHaveLength(1);
  });

  it.each([
    ["timestamp", { timestamp: "now", tool: "x", args: {}, result: { content: [] }, latencyMs: 0 }],
    ["tool", { timestamp: 1, tool: 42, args: {}, result: { content: [] }, latencyMs: 0 }],
    ["args", { timestamp: 1, tool: "x", args: [], result: { content: [] }, latencyMs: 0 }],
    ["result.content", { timestamp: 1, tool: "x", args: {}, result: {}, latencyMs: 0 }],
    ["latencyMs", { timestamp: 1, tool: "x", args: {}, result: { content: [] }, latencyMs: -1 }],
  ])("rejects malformed %s with its physical line", (field, entry) => {
    const path = writeTranscript(`\n${JSON.stringify(entry)}\n`);
    expect(() => replayTranscript(path)).toThrow(`line 2, field ${field}`);
  });
});
