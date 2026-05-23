import { substituteTemplates } from "./template.js";
import type {
  MockCatalog,
  ToolDefinition,
  CallArgs,
  ContentBlock,
  ToolResponse,
} from "./types.js";

/** Deep-clone a response template into a usable ToolResponse. */
function cloneResponse(resp: ToolResponse, args: CallArgs): ToolResponse {
  const content = resp.content.map((block): ContentBlock => {
    if (block.type === "text" && block.text) {
      return { ...block, text: substituteTemplates(block.text, args) };
    }
    return { ...block };
  });
  return { content, ...(resp.isError !== undefined ? { isError: resp.isError } : {}) };
}

/**
 * Find a tool by name in the catalog.
 */
export function findTool(catalog: MockCatalog, name: string): ToolDefinition | undefined {
  return catalog.tools.find((t) => t.name === name);
}

/**
 * Execute a tool call against a mock catalog and return a response.
 */
export function runCall(
  catalog: MockCatalog,
  toolName: string,
  args: CallArgs,
  variant?: string
): ToolResponse {
  const tool = findTool(catalog, toolName);
  if (!tool) {
    return {
      content: [{ type: "text", text: `Error: tool "${toolName}" not found in catalog` }],
      isError: true,
    };
  }

  const response = tool.responses;

  // Try variant first
  if (variant && response.variants && response.variants[variant]) {
    return cloneResponse(response.variants[variant], args);
  }

  // Fall back to default
  if (response.default) {
    return cloneResponse(response.default, args);
  }

  return {
    content: [{ type: "text", text: `Error: no default response defined for "${toolName}"` }],
    isError: true,
  };
}

/**
 * List all tools in a catalog as a simple array.
 */
export function listTools(catalog: MockCatalog): Array<{ name: string; description: string }> {
  return catalog.tools.map((t) => ({
    name: t.name,
    description: t.description,
  }));
}

/**
 * Format tool list for human-readable display.
 */
export function formatToolList(tools: Array<{ name: string; description: string }>): string {
  return tools.map((t) => `${t.name} — ${t.description}`).join("\n");
}
