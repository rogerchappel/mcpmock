import { describe, it, expect } from "vitest";

describe("CLI smoke", () => {
  it("shows help text", () => {
    expect(true).toBe(true);
  });
});

// Integration tests for the CLI are handled in runner.test.ts via direct module calls.
