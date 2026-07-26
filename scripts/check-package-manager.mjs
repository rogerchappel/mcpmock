import { existsSync, readFileSync } from "node:fs";

const failures = [];
const conflictingLocks = ["pnpm-lock.yaml", "yarn.lock", "bun.lock", "bun.lockb"];
const workflowFiles = [
  ".github/workflows/ci.yml",
  ".github/workflows/release-dry-run.yml",
  ".github/workflows/release.yml",
];

if (!existsSync("package-lock.json")) {
  failures.push("package-lock.json is required for deterministic npm installs");
}

for (const lockfile of conflictingLocks) {
  if (existsSync(lockfile)) {
    failures.push(`conflicting package-manager lockfile found: ${lockfile}`);
  }
}

for (const workflowFile of workflowFiles) {
  const workflow = readFileSync(workflowFile, "utf8");

  if (!/\bnpm ci\b/.test(workflow)) {
    failures.push(`${workflowFile} must install project dependencies with npm ci`);
  }

  if (/\b(?:pnpm|yarn|bun)(?:\s|@)/.test(workflow)) {
    failures.push(`${workflowFile} references a non-npm package manager`);
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`FAIL: ${failure}`);
  }
  process.exit(1);
}

console.log("Package-manager configuration is consistent: npm ci + package-lock.json");
