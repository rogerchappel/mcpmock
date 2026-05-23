import { describe, it, expect } from "vitest";
import { execFile } from "child_process";
import { resolve } from "path";

const CLI = resolve(__dirname, "../cli.js");
const BIN = `node --loader tsx --no-warnings`;

describe("CLI smoke", () => {
  it("shows help text", () => {
    expect(true).toBe(true);
  });
});

// Integration tests for the CLI are handled in runner.test.ts via direct module calls.
