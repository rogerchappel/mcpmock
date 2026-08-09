import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const failures = [];
const packageJson = JSON.parse(read("package.json"));
const releasebox = JSON.parse(read("releasebox.config.json"));
const readme = read("README.md");
const workflow = read(".github/workflows/release.yml");

const advertisesNpm = /npm (?:install|i)\b|npx\s+@rogerchappel\/mcpmock/.test(readme);
if (advertisesNpm && releasebox.release?.publishNpm !== true) {
  failures.push("README advertises npm installation but ReleaseBox npm publishing is not enabled");
}

if (packageJson.name !== "@rogerchappel/mcpmock") {
  failures.push("package name must remain @rogerchappel/mcpmock");
}
if (packageJson.publishConfig?.access !== "public") {
  failures.push("publishConfig.access must be public");
}
if (!/^\s*id-token:\s*write\s*$/m.test(workflow)) {
  failures.push("release workflow must grant id-token: write for npm trusted publishing");
}
if (!/npm publish[^\n]*--provenance[^\n]*--access public/.test(workflow)) {
  failures.push("release workflow must publish to npm with provenance and public access");
}
if (!/GITHUB_REF_NAME/.test(workflow) || !/package_version/.test(workflow)) {
  failures.push("release workflow must verify the tag against the package version");
}

const publishAt = workflow.indexOf("npm publish");
const githubReleaseAt = workflow.indexOf("gh release create");
if (publishAt < 0 || githubReleaseAt < 0 || publishAt > githubReleaseAt) {
  failures.push("npm publication must happen before GitHub release creation");
}

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exit(1);
}

console.log("Release configuration is ready for trusted npm publishing");
