import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import type { MockCatalog, ToolDefinition } from "./types.js";

export interface GenerateOptions {
  toolCount: number;
  output: string;
  format: "json" | "yaml";
}

const sampleTools: Omit<ToolDefinition, "responses">[] = [
  {
    name: "weather",
    description: "Get current weather conditions for a location",
    inputSchema: {
      type: "object",
      properties: {
        location: { type: "string", description: "City or location" },
        units: { type: "string", description: "metric or imperial", enum: ["metric", "imperial"] },
      },
      required: ["location"],
    },
  },
  {
    name: "date_time",
    description: "Get the current date and time",
    inputSchema: {
      type: "object",
      properties: {
        timezone: { type: "string", description: "IANA timezone" },
        format: { type: "string", description: "Output format" },
      },
      required: [],
    },
  },
  {
    name: "calculator",
    description: "Perform a calculation",
    inputSchema: {
      type: "object",
      properties: {
        expression: { type: "string", description: "Math expression" }
      },
      required: ["expression"],
    },
  },
  {
    name: "url_fetch",
    description: "Fetch content from a URL",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Target URL" },
        method: { type: "string", description: "HTTP method", default: "GET" },
      },
      required: ["url"],
    },
  },
  {
    name: "database_query",
    description: "Run a SQL query against the mock database",
    inputSchema: {
      type: "object",
      properties: {
        sql: { type: "string", description: "SQL query string" },
      },
      required: ["sql"],
    },
  },
  {
    name: "git_diff",
    description: "Show diff between branches or commits",
    inputSchema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Source ref" },
        to: { type: "string", description: "Target ref" },
      },
      required: ["from", "to"],
    },
  },
  {
    name: "email_compose",
    description: "Compose an email message",
    inputSchema: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient" },
        subject: { type: "string", description: "Subject line" },
        body: { type: "string", description: "Email body" },
      },
      required: ["to"],
    },
  },
  {
    name: "image_generate",
    description: "Generate an image from a text prompt",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Image description" },
        size: { type: "string", description: "Image size" },
      },
      required: ["prompt"],
    },
  },
];

export function generateTool(toolIndex: number): ToolDefinition {
  const base = sampleTools[toolIndex % sampleTools.length];
  return {
    ...base,
    responses: {
      default: {
        content: [{ type: "text", text: `Mock response from ${base.name}` }],
      },
    },
  };
}

export function generateCatalog(opts: GenerateOptions): MockCatalog {
  const tools: ToolDefinition[] = [];
  const count = Math.min(opts.toolCount, sampleTools.length);
  const used = new Set<string>();

  for (let i = 0; tools.length < count && i < count * 2; i++) {
    const tool = generateTool(i);
    if (!used.has(tool.name)) {
      used.add(tool.name);
      tools.push(tool);
    }
  }

  return {
    name: "generated-catalog",
    description: `Generated mock catalog with ${tools.length} tools`,
    tools,
  };
}

export function writeCatalog(catalog: MockCatalog, outputPath: string) {
  const resolved = resolve(outputPath);
  const dir = dirname(resolved);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(resolved, JSON.stringify(catalog, null, 2));
  return resolved;
}

export function listGeneratedTools(): string[] {
  return sampleTools.map((t) => t.name);
}
