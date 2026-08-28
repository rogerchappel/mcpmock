import { describe, it, expect } from "vitest";
import { validateCatalog, validateCatalogStrict } from "../catalog.js";

const validCatalog: Record<string, unknown> = {
  tools: [
    {
      name: "search",
      description: "Search the knowledge base",
      inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
      responses: {
        default: { content: [{ type: "text", text: "Results for {query}" }] },
      },
    },
  ],
};

describe("validateCatalog", () => {
  it("accepts a valid catalog", () => {
    const result = validateCatalog(validCatalog);
    expect(result.valid).toBe(true);
    expect(result.toolCount).toBe(1);
    expect(result.errors).toEqual([]);
  });

  it("rejects a catalog without tools array", () => {
    const result = validateCatalog({});
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors![0].path).toBe("$.tools");
  });

  it("rejects a tool without name", () => {
    const catalog = { tools: [{ description: "no name", inputSchema: {}, responses: {} }] };
    const result = validateCatalog(catalog);
    expect(result.valid).toBe(false);
    expect(result.errors?.some((e) => e.path.includes("name"))).toBe(true);
  });

  it.each([null, "tool", 42, [], true])(
    "rejects non-object tool entry %j at its array path",
    (tool) => {
      const result = validateCatalog({ tools: [tool] });

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: "$.tools[0]",
        message: "Tool must be an object",
      });
    }
  );

  it("rejects a tool without description", () => {
    const catalog = {
      $schema: "v1",
      name: "test",
      tools: [{ name: "x", inputSchema: { type: "object" }, responses: { default: { content: [{ type: "text" }] } } }],
    };
    const result = validateCatalog(catalog);
    expect(result.valid).toBe(false);
  });

  it("rejects a tool without inputSchema", () => {
    const catalog = {
      tools: [{ name: "x", description: "d", responses: { default: { content: [{ type: "text" }] } } }],
    };
    const result = validateCatalog(catalog);
    expect(result.valid).toBe(false);
    expect(result.errors?.some((e) => e.path.includes("inputSchema"))).toBe(true);
  });

  it("rejects a tool without responses", () => {
    const catalog = { tools: [{ name: "x", description: "d", inputSchema: { type: "object" } }] };
    const result = validateCatalog(catalog);
    expect(result.valid).toBe(false);
    expect(result.errors?.some((e) => e.path.includes("responses"))).toBe(true);
  });

  it("rejects a tool without default response", () => {
    const catalog = {
      tools: [
        {
          name: "x",
          description: "d",
          inputSchema: { type: "object" },
          responses: { variants: { alt: { content: [{ type: "text", text: "ok" }] } } },
        },
      ],
    };
    const result = validateCatalog(catalog);
    expect(result.valid).toBe(false);
    expect(result.errors?.some((e) => e.path.includes("default"))).toBe(true);
  });

  it.each([null, "response", 42, [], true])(
    "rejects non-object default response %j at its precise path",
    (defaultResponse) => {
      const catalog = {
        tools: [
          {
            name: "x",
            description: "d",
            inputSchema: { type: "object" },
            responses: { default: defaultResponse },
          },
        ],
      };
      const result = validateCatalog(catalog);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: "$.tools[0].responses.default",
        message: "Default response must be an object",
      });
    }
  );

  it("rejects an array responses value as a non-object shape", () => {
    const catalog = {
      tools: [{ name: "x", description: "d", inputSchema: {}, responses: [] }],
    };
    const result = validateCatalog(catalog);

    expect(result.errors).toContainEqual({
      path: "$.tools[0].responses",
      message: "Tool must have a responses object",
    });
  });

  it("rejects duplicate tool names", () => {
    const catalog = {
      tools: [
        { name: "dup", description: "d", inputSchema: { type: "object" }, responses: { default: { content: [{ type: "text", text: "ok" }] } } },
        { name: "dup", description: "d", inputSchema: { type: "object" }, responses: { default: { content: [{ type: "text", text: "ok" }] } } },
      ],
    };
    const result = validateCatalog(catalog);
    expect(result.valid).toBe(false);
    expect(result.errors?.some((e) => e.message.includes("Duplicate"))).toBe(true);
  });

  it("validates multiple tools correctly", () => {
    const catalog = {
      tools: [
        { name: "a", description: "d", inputSchema: { type: "object" }, responses: { default: { content: [{ type: "text", text: "ok" }] } } },
        { name: "b", description: "d", inputSchema: { type: "object" }, responses: { default: { content: [{ type: "text", text: "ok" }] } } },
      ],
    };
    const result = validateCatalog(catalog);
    expect(result.valid).toBe(true);
    expect(result.toolCount).toBe(2);
  });

  it.each([
    ["missing", {}],
    ["non-array", { content: "text" }],
    ["empty", { content: [] }],
  ])("rejects %s default response content", (_shape, defaultResponse) => {
    const catalog = {
      tools: [
        { name: "x", description: "d", inputSchema: { type: "object" }, responses: { default: defaultResponse } },
      ],
    };

    for (const validate of [validateCatalog, validateCatalogStrict]) {
      const result = validate(catalog);
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        path: "$.tools[0].responses.default.content",
        message: "Response content must be a non-empty array",
      });
    }
  });

  it.each([
    ["missing type", {}, ".type"],
    ["unsupported type", { type: "audio" }, ".type"],
    ["text without text", { type: "text" }, ".text"],
    ["image without data", { type: "image", mimeType: "image/png" }, ".data"],
    ["image without mime type", { type: "image", data: "abc" }, ".mimeType"],
    ["resource without URI", { type: "resource" }, ".uri"],
  ])("rejects %s with an indexed content path", (_label, block, suffix) => {
    const catalog = { tools: [{ name: "x", description: "d", inputSchema: { type: "object" }, responses: { default: { content: [block] } } }] };
    const result = validateCatalog(catalog);
    expect(result.valid).toBe(false);
    expect(result.errors?.some((error) => error.path === `$.tools[0].responses.default.content[0]${suffix}`)).toBe(true);
  });

  it("accepts every supported content block and boolean isError", () => {
    const catalog = { tools: [{ name: "x", description: "d", inputSchema: { type: "object" }, responses: { default: { isError: false, content: [
      { type: "text", text: "ok" },
      { type: "image", data: "abc", mimeType: "image/png" },
      { type: "resource", uri: "file:///fixture.txt" },
    ] } } }] };
    expect(validateCatalog(catalog).valid).toBe(true);
  });

  it("validates variant responses and optional isError", () => {
    const catalog = { tools: [{ name: "x", description: "d", inputSchema: { type: "object" }, responses: {
      default: { content: [{ type: "text", text: "ok" }] },
      variants: { broken: { isError: "yes", content: [{ type: "image" }] } },
    } }] };
    const result = validateCatalog(catalog);
    expect(result.valid).toBe(false);
    expect(result.errors?.map((error) => error.path)).toEqual(expect.arrayContaining([
      "$.tools[0].responses.variants.broken.isError",
      "$.tools[0].responses.variants.broken.content[0].data",
      "$.tools[0].responses.variants.broken.content[0].mimeType",
    ]));
  });
});

describe("validateCatalogStrict", () => {
  it("rejects non-object inputSchema type", () => {
    const catalog = {
      tools: [
        {
          name: "x",
          description: "d",
          inputSchema: { type: "array" },
          responses: { default: { content: [{ type: "text", text: "ok" }] } },
        },
      ],
    };
    const result = validateCatalogStrict(catalog);
    expect(result.valid).toBe(false);
    expect(result.errors?.some((e) => e.message.includes('"object"'))).toBe(true);
  });

  it("accepts valid schema type", () => {
    const result = validateCatalogStrict(validCatalog);
    expect(result.valid).toBe(true);
  });

  it("remains safe when base validation rejects malformed tools", () => {
    expect(() => validateCatalogStrict({ tools: [null] })).not.toThrow();
    expect(validateCatalogStrict({ tools: [null] }).valid).toBe(false);
  });
});
