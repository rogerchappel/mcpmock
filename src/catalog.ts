import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { MockCatalog, ValidationResult, ValidationError } from "./types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateResponse(response: unknown, base: string, errors: ValidationError[]): void {
  if (!isRecord(response)) {
    errors.push({ path: base, message: "Response must be an object" });
    return;
  }
  if (response.isError !== undefined && typeof response.isError !== "boolean") {
    errors.push({ path: `${base}.isError`, message: "Response isError must be a boolean" });
  }
  if (!Array.isArray(response.content) || response.content.length === 0) {
    errors.push({ path: `${base}.content`, message: "Response content must be a non-empty array" });
    return;
  }
  response.content.forEach((block, index) => {
    const path = `${base}.content[${index}]`;
    if (!isRecord(block)) {
      errors.push({ path, message: "Content block must be an object" });
      return;
    }
    if (!(["text", "image", "resource"] as unknown[]).includes(block.type)) {
      errors.push({ path: `${path}.type`, message: "Content block type must be text, image, or resource" });
      return;
    }
    if (block.type === "text" && typeof block.text !== "string") {
      errors.push({ path: `${path}.text`, message: "Text content block must have string text" });
    }
    if (block.type === "image") {
      if (typeof block.data !== "string") errors.push({ path: `${path}.data`, message: "Image content block must have string data" });
      if (typeof block.mimeType !== "string") errors.push({ path: `${path}.mimeType`, message: "Image content block must have string mimeType" });
    }
    if (block.type === "resource" && typeof block.uri !== "string") {
      errors.push({ path: `${path}.uri`, message: "Resource content block must have string uri" });
    }
  });
}

/**
 * Load and parse a mock catalog from a JSON file.
 */
export function loadCatalog(catalogPath: string): MockCatalog {
  const resolved = resolve(catalogPath);
  const raw = readFileSync(resolved, "utf8");
  const catalog = JSON.parse(raw) as MockCatalog;
  return catalog;
}

/** Load a catalog and reject invalid runtime shapes before it is consumed. */
export function loadValidatedCatalog(catalogPath: string): MockCatalog {
  const catalog = loadCatalog(catalogPath);
  const result = validateCatalog(catalog as unknown as Record<string, unknown>);
  if (!result.valid) {
    const detail = result.errors?.map((error) => `${error.path}: ${error.message}`).join("; ");
    throw new Error(`Invalid catalog: ${detail ?? "catalog validation failed"}`);
  }
  return catalog;
}

/**
 * Validate a mock catalog structure.
 */
export function validateCatalog(catalog: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = [];

  if (!isRecord(catalog) || !Array.isArray(catalog.tools)) {
    errors.push({ path: "$.tools", message: "Catalog must have a 'tools' array" });
    return { valid: false, errors };
  }

  const tools = catalog.tools;

  for (let i = 0; i < tools.length; i++) {
    const tool = tools[i];
    const base = `$.tools[${i}]`;

    if (!isRecord(tool)) {
      errors.push({ path: base, message: "Tool must be an object" });
      continue;
    }

    if (typeof tool.name !== "string" || tool.name.length === 0) {
      errors.push({ path: `${base}.name`, message: "Tool name must be a non-empty string" });
    }

    if (typeof tool.description !== "string" || tool.description.length === 0) {
      errors.push({ path: `${base}.description`, message: "Tool description must be a non-empty string" });
    }

    if (!isRecord(tool.inputSchema)) {
      errors.push({ path: `${base}.inputSchema`, message: "Tool must have an inputSchema object" });
    }

    if (!isRecord(tool.responses)) {
      errors.push({ path: `${base}.responses`, message: "Tool must have a responses object" });
      continue;
    }

    const responses = tool.responses as Record<string, unknown>;
    if (!("default" in responses)) {
      errors.push({ path: `${base}.responses.default`, message: "Tool must have a default response" });
      continue;
    }

    const defaultResp = responses.default;
    if (!isRecord(defaultResp)) {
      errors.push({ path: `${base}.responses.default`, message: "Default response must be an object" });
      continue;
    }

    validateResponse(defaultResp, `${base}.responses.default`, errors);

    if (responses.variants !== undefined) {
      if (!isRecord(responses.variants)) {
        errors.push({ path: `${base}.responses.variants`, message: "Response variants must be an object" });
      } else {
        for (const [name, response] of Object.entries(responses.variants)) {
          validateResponse(response, `${base}.responses.variants.${name}`, errors);
        }
      }
    }
  }

  const names = tools
    .filter(isRecord)
    .map((tool) => tool.name)
    .filter((name): name is string => typeof name === "string" && name.length > 0);
  const seen = new Set<string>();
  for (const name of names) {
    if (seen.has(name)) {
      errors.push({ path: "$.tools", message: `Duplicate tool name: "${name}"` });
    }
    seen.add(name);
  }

  return { valid: errors.length === 0, errors, toolCount: tools.length };
}

/**
 * Strict validation that also checks inputSchema shape.
 */
export function validateCatalogStrict(catalog: Record<string, unknown>): ValidationResult {
  const result = validateCatalog(catalog);

  const tools = isRecord(catalog) && Array.isArray(catalog.tools) ? catalog.tools : [];
  for (let i = 0; i < tools.length; i++) {
    const tool = tools[i];
    if (!isRecord(tool) || !isRecord(tool.inputSchema)) {
      continue;
    }
    const base = `$.tools[${i}]`;
    const schema = tool.inputSchema;
    if (schema.type !== "object") {
      result.errors ??= [];
      result.errors.push({
        path: `${base}.inputSchema.type`,
        message: `inputSchema.type must be "object", got "${schema.type}"`,
      });
      result.valid = false;
    }
  }

  return result;
}
