import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

function parseVersion(version, source) {
  const match = SEMVER.exec(version);
  if (!match) throw new Error(`${source} has invalid version metadata: ${version}`);
  return {
    core: match.slice(1, 4).map(Number),
    prerelease: match[4]?.split(".") ?? [],
  };
}

function compareIdentifiers(left, right) {
  const leftNumber = /^\d+$/.test(left) ? Number(left) : null;
  const rightNumber = /^\d+$/.test(right) ? Number(right) : null;
  if (leftNumber !== null && rightNumber !== null) return Math.sign(leftNumber - rightNumber);
  if (leftNumber !== null) return -1;
  if (rightNumber !== null) return 1;
  return left.localeCompare(right);
}

export function compareVersions(left, right) {
  const a = parseVersion(left, "package");
  const b = parseVersion(right, "registry");
  for (let index = 0; index < 3; index += 1) {
    if (a.core[index] !== b.core[index]) return Math.sign(a.core[index] - b.core[index]);
  }
  if (!a.prerelease.length && !b.prerelease.length) return 0;
  if (!a.prerelease.length) return 1;
  if (!b.prerelease.length) return -1;
  const length = Math.max(a.prerelease.length, b.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    if (a.prerelease[index] === undefined) return -1;
    if (b.prerelease[index] === undefined) return 1;
    const comparison = compareIdentifiers(a.prerelease[index], b.prerelease[index]);
    if (comparison !== 0) return comparison;
  }
  return 0;
}

export async function checkRegistryVersion({
  packageName,
  packageVersion,
  registryUrl = "https://registry.npmjs.org",
  fetchImpl = fetch,
}) {
  parseVersion(packageVersion, "package");
  const endpoint = `${registryUrl.replace(/\/$/, "")}/${encodeURIComponent(packageName)}/latest`;
  let response;
  try {
    response = await fetchImpl(endpoint, { signal: AbortSignal.timeout(10_000) });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`npm registry unavailable (${reason}); refusing to infer publishability`);
  }

  if (response.status === 404) return { publishedVersion: null };
  if (!response.ok) {
    throw new Error(`npm registry unavailable (HTTP ${response.status}); refusing to infer publishability`);
  }

  let metadata;
  try {
    metadata = await response.json();
  } catch {
    throw new Error("npm registry returned invalid version metadata: response was not JSON");
  }
  if (typeof metadata.version !== "string") {
    throw new Error("npm registry returned invalid version metadata: missing version");
  }
  parseVersion(metadata.version, "registry");
  if (compareVersions(packageVersion, metadata.version) <= 0) {
    throw new Error(`package version ${packageVersion} must be greater than published version ${metadata.version}`);
  }
  return { publishedVersion: metadata.version };
}

async function main() {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
  const result = await checkRegistryVersion({
    packageName: packageJson.name,
    packageVersion: packageJson.version,
    registryUrl: process.env.NPM_CONFIG_REGISTRY || "https://registry.npmjs.org",
  });
  if (result.publishedVersion === null) {
    console.log(`${packageJson.name}@${packageJson.version} is publishable: package is not present on npm (404)`);
  } else {
    console.log(`${packageJson.name}@${packageJson.version} is newer than npm version ${result.publishedVersion}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`Registry version check failed: ${error.message}`);
    process.exitCode = 1;
  });
}
