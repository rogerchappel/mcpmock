/**
 * Orchestration engine for multi-step MCP mock conversation flows.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runCall } from "./runner.js";
import { newTranscript } from "./transcript.js";
import type { MockCatalog, CallResponse, ContentBlock, TranscriptEntry } from "./types.js";

export interface OrchestrationStep {
  tool: string;
  args: Record<string, unknown>;
  storeAs?: string;
  next?: string;
  on?: Record<string, string>;
  variant?: string;
}

export interface OrchestrationScript {
  name: string;
  description?: string;
  vars?: Record<string, unknown>;
  steps: OrchestrationStep[];
}

export interface OrchestrationResult {
  name: string;
  success: boolean;
  transcript: TranscriptEntry[];
  vars: Record<string, unknown>;
  error?: string;
  stepsExecuted: number;
}

function resolveVarRefs(
  obj: Record<string, unknown>,
  vars: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === "string") {
      result[key] = val.replace(
        /\$\{(\w+)\}/g,
        (_m, v: string) => (v in vars ? String(vars[v]) : _m)
      );
    } else {
      result[key] = val;
    }
  }
  return result;
}

function conditionMatches(response: CallResponse, condition: string): boolean {
  const text = response.content
    .filter((c: ContentBlock) => c.type === "text")
    .map((c: ContentBlock) => c.text ?? "")
    .join(" ")
    .toLowerCase();

  switch (condition.toLowerCase()) {
    case "iserror":
      return !!response.isError;
    case "isempty":
      return text === "";
    case "hasresults":
      return text.includes("result") || text.includes("found");
    default:
      return text.includes(condition.toLowerCase());
  }
}

export function executeScript(
  catalog: MockCatalog,
  script: OrchestrationScript
): OrchestrationResult {
  const transcript: TranscriptEntry[] = [];
  const vars: Record<string, unknown> = { ...(script.vars ?? {}) };
  const labels = new Map<string, number>();

  script.steps.forEach((s, i) => {
    if (s.next) labels.set(s.next, i + 1);
  });

  let stepsExecuted = 0;
  let idx = 0;
  const maxSteps = script.steps.length * 10;

  while (idx < script.steps.length && stepsExecuted < maxSteps) {
    const step = script.steps[idx];
    const resolvedArgs = resolveVarRefs(step.args, vars);
    const result = runCall(catalog, step.tool, resolvedArgs, step.variant);
    const entry = newTranscript(step.tool, resolvedArgs, result, step.variant);
    transcript.push(entry);

    if (step.storeAs) {
      const text = result.content
        .filter((c: ContentBlock) => c.type === "text")
        .map((c: ContentBlock) => c.text ?? "")
        .join(" ");
      vars[step.storeAs] = text;
    }

    stepsExecuted++;

    if (result.isError && step.on?.isError) {
      const target = step.on.isError;
      if (labels.has(target)) idx = labels.get(target)!;
      else break;
    } else if (step.on) {
      let jumped = false;
      for (const [cond, label] of Object.entries(step.on)) {
        if (conditionMatches(result, cond) && labels.has(label)) {
          idx = labels.get(label)!;
          jumped = true;
          break;
        }
      }
      if (!jumped) idx++;
    } else {
      idx++;
    }
  }

  return {
    name: script.name,
    success: stepsExecuted >= script.steps.length,
    transcript,
    vars,
    stepsExecuted,
    ...(stepsExecuted >= maxSteps ? { error: "Exceeded maximum steps" as const } : {}),
  };
}

export function loadOrchestration(filePath: string): OrchestrationScript {
  const resolved = resolve(filePath);
  const raw = readFileSync(resolved, "utf8");
  return JSON.parse(raw) as OrchestrationScript;
}
