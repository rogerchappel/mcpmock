import { readFileSync } from "node:fs";
import type { CallArgs, CallResponse, TranscriptEntry } from "./types.js";

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
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as TranscriptEntry);
}
