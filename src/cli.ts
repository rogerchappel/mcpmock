#!/usr/bin/env node
import { Command, InvalidArgumentError } from "commander";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { loadCatalog, validateCatalog, validateCatalogStrict } from "./catalog.js";
import { runCall, listTools, formatToolList } from "./runner.js";
import { newTranscript, recordEntry, replayTranscript } from "./transcript.js";
import { parseReplaySpeed, replayEntries } from "./replay.js";
import { generateCatalog, writeCatalog, listGeneratedTools as availableTools } from "./generator.js";
import type { CliOptions } from "./types.js";

const program = new Command();

program
  .name("mcpmock")
  .description("Fixture-backed mock MCP tool catalogs for deterministic agent testing")
  .version("0.1.0");

// ── validate ────────────────────────────────────────────
program
  .command("validate <catalog>")
  .description("Validate a mock catalog")
  .option("-o, --strict", "Enable strict schema validation")
  .action((catalogPath: string, opts: { strict?: boolean }) => {
    const catalog = loadCatalog(catalogPath);
    const result = opts.strict
      ? validateCatalogStrict(catalog as unknown as Record<string, unknown>)
      : validateCatalog(catalog as unknown as Record<string, unknown>);

    if (result.valid) {
      console.log(`✅ Catalog is valid: ${result.toolCount ?? 0} tool(s) defined`);
    } else {
      console.error("❌ Catalog validation failed:");
      for (const err of result.errors!) {
        console.error(`  ${err.path}: ${err.message}`);
      }
      process.exit(1);
    }
  });

// ── tools ───────────────────────────────────────────────
program
  .command("tools <catalog>")
  .description("List tools in a catalog")
  .option("-f, --format <format>", "Output format (json|text)", "text")
  .action((catalogPath: string, opts: { format?: string }) => {
    const catalog = loadCatalog(catalogPath);
    const tools = listTools(catalog);

    if (opts.format === "json") {
      console.log(JSON.stringify(tools, null, 2));
    } else {
      console.log(formatToolList(tools));
    }
  });

// ── call ────────────────────────────────────────────────
program
  .command("call <catalog> <tool-name> [args-json]")
  .description("Call a mock tool")
  .option("-v, --variant <name>", "Response variant to use")
  .option("-r, --record", "Record this call to transcript")
  .option("-o, --output <path>", "Transcript output path", "transcript.jsonl")
  .action(
    (catalogPath: string, toolName: string, argsJson: string | undefined, opts: CliOptions) => {
      const catalog = loadCatalog(catalogPath);
      const args: Record<string, unknown> = argsJson ? JSON.parse(argsJson) : {};

      const result = runCall(catalog, toolName, args, opts.variant);
      console.log(JSON.stringify(result, null, 2));

      if (opts.record) {
        const entry = newTranscript(toolName, args, result, opts.variant);
        const line = recordEntry(entry);
        const outPath = opts.output ?? "transcript.jsonl";
        const existing = existsSync(outPath) ? readFileSync(outPath, "utf8") : "";
        writeFileSync(outPath, existing + (existing ? "\n" : "") + line + "\n");
        console.error(`📝 Recorded to ${outPath}`);
      }
    }
  );

// ── replay ──────────────────────────────────────────────
program
  .command("replay <transcript>")
  .description("Replay a transcript file")
  .option("--fast", "Skip timing delays")
  .option(
    "--speed <factor>",
    "Playback speed multiplier (must be positive)",
    (value: string) => {
      try {
        return parseReplaySpeed(value);
      } catch (error) {
        throw new InvalidArgumentError((error as Error).message);
      }
    },
    1
  )
  .action(async (filePath: string, opts: { fast?: boolean; speed?: number }) => {
    const entries = replayTranscript(filePath);

    await replayEntries(entries, {
      fast: opts.fast ?? false,
      speed: opts.speed ?? 1,
      onEntry: (entry) => {
        console.log(
          JSON.stringify({
            tool: entry.tool,
            args: entry.args,
            result: entry.result,
            variant: entry.variant,
          })
        );
      },
    });

    console.error(`▶️ Replay complete: ${entries.length} entries`);
  });

program
  .command("generate [output]")
  .description("Generate a mock catalog with sample tools")
  .option("-c, --count <number>", "Number of tools to generate", "5")
  .action((outputPath: string | undefined, opts: { count?: string }) => {
    const catalog = generateCatalog({
      toolCount: parseInt(opts.count ?? "5", 10),
      format: "json",
      output: outputPath ?? "catalog.json",
    });
    const path = writeCatalog(catalog, outputPath ?? "catalog.json");
    console.log(`✅ Generated ${catalog.tools.length} tools → ${path}`);
    console.log(`Available tools: ${availableTools().join(", ")}`);
  });

await program.parseAsync();
