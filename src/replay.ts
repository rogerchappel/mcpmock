import type { TranscriptEntry } from "./types.js";

export interface ReplayOptions {
  fast?: boolean;
  speed?: number;
  sleep?: (delayMs: number) => Promise<void>;
  onEntry?: (entry: TranscriptEntry) => void;
}

const defaultSleep = (delayMs: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, delayMs));

export function parseReplaySpeed(value: string): number {
  const speed = Number(value);
  if (!Number.isFinite(speed) || speed <= 0) {
    throw new Error(`Playback speed must be a positive finite number (received "${value}")`);
  }
  return speed;
}

export async function replayEntries(
  entries: TranscriptEntry[],
  options: ReplayOptions = {}
): Promise<void> {
  const speed = options.speed ?? 1;
  const sleep = options.sleep ?? defaultSleep;

  for (const entry of entries) {
    options.onEntry?.(entry);

    if (!options.fast && entry.latencyMs > 0) {
      await sleep(entry.latencyMs / speed);
    }
  }
}
