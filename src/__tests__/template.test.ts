import { describe, it, expect } from "vitest";
import { substituteTemplates } from "../template.js";

describe("substituteTemplates", () => {
  it("replaces single variable", () => {
    expect(substituteTemplates("Hello {name}!", { name: "World" })).toBe("Hello World!");
  });

  it("replaces multiple variables", () => {
    expect(substituteTemplates("{a} + {b} = {c}", { a: "1", b: "2", c: "3" })).toBe("1 + 2 = 3");
  });

  it("leaves unknown variables intact", () => {
    expect(substituteTemplates("Hello {unknown}!", { name: "x" })).toBe("Hello {unknown}!");
  });

  it("handles no variables", () => {
    expect(substituteTemplates("plain text", {})).toBe("plain text");
  });

  it("handles empty args", () => {
    expect(substituteTemplates("{x}{y}", {})).toBe("{x}{y}");
  });

  it("repeats variables", () => {
    expect(substituteTemplates("{x} and {x}", { x: "hi" })).toBe("hi and hi");
  });

  it("handles nested braces gracefully", () => {
    expect(substituteTemplates("{x}} {y}", { x: "a", y: "b" })).toBe("a} b");
  });
});
