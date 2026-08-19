import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const cli = join(process.cwd(), "dist", "cli.js");
const catalog = "fixtures/catalog.json";
const fixtureTranscript = "fixtures/transcript.jsonl";
const smokeRoot = mkdtempSync(join(tmpdir(), "mcpmock-docs-smoke-"));
const recordedTranscript = join(smokeRoot, "transcript.jsonl");
const generatedCatalog = join(smokeRoot, "generated-catalog.json");

function run(args) {
  return execFileSync(process.execPath, [cli, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
}

function verifyPrepublicationCheckout(readme) {
  const documentedCommands = [
    "git clone https://github.com/rogerchappel/mcpmock.git",
    "cd mcpmock",
    "npm ci",
    "npm run build",
    "node dist/cli.js --help",
  ];
  for (const command of documentedCommands) {
    if (!readme.includes(command)) {
      throw new Error(`Pre-publication checkout docs are missing command: ${command}`);
    }
  }
  if (!readme.includes("not yet published to the npm registry")) {
    throw new Error("Installation docs must state that the package is not yet published.");
  }
  if (!readme.includes("After the package is published to npm")) {
    throw new Error("Registry commands must be labelled as post-publication instructions.");
  }

  const checkout = join(smokeRoot, "clean-checkout");
  mkdirSync(checkout);
  const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "buffer" })
    .toString("utf8")
    .split("\0")
    .filter(Boolean);
  for (const path of tracked) {
    const destination = join(checkout, path);
    mkdirSync(join(destination, ".."), { recursive: true });
    cpSync(path, destination);
  }
  execFileSync("npm", ["ci"], { cwd: checkout, stdio: "pipe" });
  execFileSync("npm", ["run", "build"], { cwd: checkout, stdio: "pipe" });
  const help = execFileSync(process.execPath, [join(checkout, "dist", "cli.js"), "--help"], {
    cwd: checkout,
    encoding: "utf8",
  });
  if (!help.includes("Usage: mcpmock [options] [command]")) {
    throw new Error("Documented pre-publication checkout command returned unexpected help output.");
  }
}

try {
  const readme = readFileSync("README.md", "utf8");
  const prd = readFileSync("docs/PRD.md", "utf8");
  const requiredExamples = [
    `mcpmock validate ${catalog} --strict`,
    `mcpmock tools ${catalog} --format json`,
    `mcpmock call ${catalog} search`,
    `mcpmock replay ${fixtureTranscript} --fast`,
    "mcpmock generate my-tools.json --count 3",
  ];

  verifyPrepublicationCheckout(readme);

  for (const example of requiredExamples) {
    if (!readme.includes(example) && !prd.includes(example)) {
      throw new Error(`Documented CLI smoke failed; missing example: ${example}`);
    }
  }

  if (!readme.includes("| `responses.default.content` | array | ✅ | One or more content items returned by default |")) {
    throw new Error("Catalog format docs must describe non-empty default response content.");
  }

  const combinedDocs = `${readme}\n${prd}`;
  const unsupportedReferences = [
    /fixtures\/catalog\.ya?ml\b/,
    /fixtures\/transcript\.json(?!l)\b/,
  ];
  for (const unsupported of unsupportedReferences) {
    if (unsupported.test(combinedDocs)) {
      throw new Error(`Documented CLI smoke failed; unsupported fixture reference: ${unsupported}`);
    }
  }

  const validation = run(["validate", catalog, "--strict"]);
  if (!validation.includes("Catalog is valid: 3 tool(s) defined")) {
    throw new Error("Strict validation example returned unexpected output.");
  }

  const tools = JSON.parse(run(["tools", catalog, "--format", "json"]));
  if (!Array.isArray(tools) || tools.length !== 3 || tools[0]?.name !== "search") {
    throw new Error("JSON tool-list example returned unexpected output.");
  }

  const call = JSON.parse(
    run([
      "call",
      catalog,
      "search",
      '{"query":"demo"}',
      "--record",
      "--output",
      recordedTranscript,
    ]),
  );
  if (call.content?.[0]?.text !== "Found 3 results for demo") {
    throw new Error("Recorded call example returned unexpected output.");
  }

  const fixtureReplay = run(["replay", fixtureTranscript, "--fast"]);
  const recordedReplay = run(["replay", recordedTranscript, "--fast"]);
  if (!fixtureReplay.includes('"tool":"search"') || !recordedReplay.includes('"tool":"search"')) {
    throw new Error("Replay examples returned unexpected output.");
  }

  run(["generate", generatedCatalog, "--count", "3"]);
  const generated = JSON.parse(readFileSync(generatedCatalog, "utf8"));
  if (generated.tools?.length !== 3 || generated.tools[0]?.name !== "weather") {
    throw new Error("Generate example returned unexpected output.");
  }

  console.log("Documentation CLI smoke OK: validate, tools, call/record, replay, and generate examples passed.");
} finally {
  rmSync(smokeRoot, { recursive: true, force: true });
}
