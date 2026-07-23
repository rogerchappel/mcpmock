import { describe, expect, it, vi } from "vitest";
import { parseReplaySpeed, replayEntries } from "../replay.js";
import type { TranscriptEntry } from "../types.js";

const entry = (latencyMs: number): TranscriptEntry => ({
  timestamp: 0,
  tool: "search",
  args: {},
  result: { content: [] },
  latencyMs,
});

describe("replayEntries", () => {
  it("waits for each recorded latency by default", async () => {
    const sleep = vi.fn(async () => undefined);

    await replayEntries([entry(120), entry(0), entry(80)], { sleep });

    expect(sleep.mock.calls).toEqual([[120], [80]]);
  });

  it("skips all recorded latency in fast mode", async () => {
    const sleep = vi.fn(async () => undefined);

    await replayEntries([entry(120), entry(80)], { fast: true, sleep });

    expect(sleep).not.toHaveBeenCalled();
  });

  it("scales recorded latency by the playback speed", async () => {
    const sleep = vi.fn(async () => undefined);

    await replayEntries([entry(125)], { speed: 2.5, sleep });

    expect(sleep).toHaveBeenCalledWith(50);
  });

  it("emits entries in order around their delays", async () => {
    const events: string[] = [];

    await replayEntries([entry(10), entry(20)], {
      onEntry: (value) => events.push(`entry:${value.latencyMs}`),
      sleep: async (delayMs) => {
        events.push(`sleep:${delayMs}`);
      },
    });

    expect(events).toEqual(["entry:10", "sleep:10", "entry:20", "sleep:20"]);
  });
});

describe("parseReplaySpeed", () => {
  it.each([
    ["1", 1],
    ["2.5", 2.5],
    ["0.25", 0.25],
  ])("accepts positive finite speed %s", (value, expected) => {
    expect(parseReplaySpeed(value)).toBe(expected);
  });

  it.each(["0", "-1", "NaN", "Infinity", "-Infinity", "2x"])(
    "rejects invalid speed %s",
    (value) => {
      expect(() => parseReplaySpeed(value)).toThrow("positive finite number");
    }
  );
});
