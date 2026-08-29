import { readFileSync } from "node:fs";
import type { CallArgs, CallResponse, TranscriptEntry } from "./types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function transcriptError(line: number, field: string, expectation: string): Error {
  return new Error(`Invalid transcript at line ${line}, field ${field}: ${expectation}`);
}

function validateTranscriptEntry(value: unknown, line: number): TranscriptEntry {
  if (!isRecord(value)) throw transcriptError(line, "$", "entry must be an object");
  if (typeof value.timestamp !== "number" || !Number.isFinite(value.timestamp)) {
    throw transcriptError(line, "timestamp", "must be a finite number");
  }
  if (typeof value.tool !== "string" || value.tool.length === 0) {
    throw transcriptError(line, "tool", "must be a non-empty string");
  }
  if (!isRecord(value.args)) throw transcriptError(line, "args", "must be an object");
  if (!isRecord(value.result)) throw transcriptError(line, "result", "must be an object");
  if (!Array.isArray(value.result.content)) {
    throw transcriptError(line, "result.content", "must be an array");
  }
  if (typeof value.latencyMs !== "number" || !Number.isFinite(value.latencyMs) || value.latencyMs < 0) {
    throw transcriptError(line, "latencyMs", "must be a non-negative finite number");
  }
  if (value.variant !== undefined && typeof value.variant !== "string") {
    throw transcriptError(line, "variant", "must be a string when present");
  }
  return value as unknown as TranscriptEntry;
}

/** Create a single transcript entry. */
export function newTranscript(
  tool: string,
  args: CallArgs,
  result: CallResponse,
  variant?: string,
  latencyMs: number = 0
): TranscriptEntry {
  return {
    timestamp: Date.now(),
    tool,
    args,
    result,
    ...(variant !== undefined ? { variant } : {}),
    latencyMs,
  };
}

/**
 * Append a transcript entry to a JSONL file.
 * Returns the serialized line.
 */
export function recordEntry(entry: TranscriptEntry): string {
  return JSON.stringify(entry);
}

/**
 * Read a JSONL transcript file and return entries.
 */
export function replayTranscript(filePath: string): TranscriptEntry[] {
  const raw = readFileSync(filePath, "utf8");
  return raw
    .split("\n")
    .map((text, index) => ({ text, line: index + 1 }))
    .filter(({ text }) => text.trim().length > 0)
    .map(({ text, line }) => {
      let value: unknown;
      try {
        value = JSON.parse(text);
      } catch {
        throw new Error(`Invalid transcript at line ${line}: expected valid JSON`);
      }
      return validateTranscriptEntry(value, line);
    });
}
