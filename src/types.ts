// Core type definitions for MCPMock

export interface ContentBlock {
  type: "text" | "image" | "resource";
  text?: string;
  data?: string;
  mimeType?: string;
  uri?: string;
}

export interface InputSchema {
  type: "object";
  properties?: Record<string, Record<string, unknown>>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface ToolResponse {
  content: ContentBlock[];
  isError?: boolean;
}

export interface VariantResponses {
  [variantName: string]: ToolResponse;
}

export interface ResponsesMap {
  default: ToolResponse;
  variants?: VariantResponses;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: InputSchema;
  responses: ResponsesMap;
}

export interface MockCatalog {
  $schema?: string;
  name?: string;
  description?: string;
  tools: ToolDefinition[];
}

export interface CallArgs {
  [key: string]: unknown;
}

export interface CallResponse {
  content: ContentBlock[];
  isError?: boolean;
}

export interface TranscriptEntry {
  timestamp: number;
  tool: string;
  args: CallArgs;
  result: CallResponse;
  variant?: string;
  latencyMs: number;
}

export interface ValidationError {
  path: string;
  message: string;
  keyword?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
  toolCount?: number;
}

export interface CliOptions {
  format?: "json" | "text";
  variant?: string;
  record?: boolean;
  output?: string;
  fast?: boolean;
  speed?: number;
  quiet?: boolean;
}
