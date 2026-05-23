import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { MockCatalog, ValidationResult, ValidationError } from "./types.js";

/**
 * Load and parse a mock catalog from a JSON file.
 */
export function loadCatalog(catalogPath: string): MockCatalog {
  const resolved = resolve(catalogPath);
  const raw = readFileSync(resolved, "utf8");
  const catalog = JSON.parse(raw) as MockCatalog;
  return catalog;
}

/**
 * Validate a mock catalog structure.
 */
export function validateCatalog(catalog: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = [];

  if (!("tools" in catalog) || !Array.isArray(catalog.tools)) {
    errors.push({ path: "$.tools", message: "Catalog must have a 'tools' array" });
    return { valid: false, errors };
  }

  const tools = catalog.tools as Array<Record<string, unknown>>;

  for (let i = 0; i < tools.length; i++) {
    const tool = tools[i];
    const base = `$.tools[${i}]`;

    if (typeof tool.name !== "string" || tool.name.length === 0) {
      errors.push({ path: `${base}.name`, message: "Tool name must be a non-empty string" });
    }

    if (typeof tool.description !== "string" || tool.description.length === 0) {
      errors.push({ path: `${base}.description`, message: "Tool description must be a non-empty string" });
    }

    if (!("inputSchema" in tool) || typeof tool.inputSchema !== "object" || tool.inputSchema === null) {
      errors.push({ path: `${base}.inputSchema`, message: "Tool must have an inputSchema object" });
    }

    if (!("responses" in tool) || typeof tool.responses !== "object" || tool.responses === null) {
      errors.push({ path: `${base}.responses`, message: "Tool must have a responses object" });
      continue;
    }

    const responses = tool.responses as Record<string, unknown>;
    if (!("default" in responses)) {
      errors.push({ path: `${base}.responses.default`, message: "Tool must have a default response" });
    }

    const defaultResp = responses.default as Record<string, unknown>;
    if (defaultResp && "content" in defaultResp) {
      const content = defaultResp.content;
      if (!Array.isArray(content) || content.length === 0) {
        errors.push({ path: `${base}.responses.default.content`, message: "Default response content must be a non-empty array" });
      }
    }
  }

  const names = tools.map((t) => (t.name ?? "") as string);
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

  const tools = (catalog.tools ?? []) as Array<Record<string, unknown>>;
  for (let i = 0; i < tools.length; i++) {
    const tool = tools[i];
    const base = `$.tools[${i}]`;
    const schema = tool.inputSchema as Record<string, unknown> | undefined;
    if (schema && schema.type !== "object") {
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
