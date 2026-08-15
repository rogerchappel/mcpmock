import assert from "node:assert/strict";
import { test } from "node:test";

import { checkRegistryVersion } from "./check-registry-version.mjs";

const response = (status, body = "") => new Response(body, {
  status,
  headers: { "content-type": "application/json" },
});

test("accepts a package version newer than the registry version", async () => {
  const result = await checkRegistryVersion({
    packageName: "@scope/example",
    packageVersion: "1.3.0",
    fetchImpl: async () => response(200, JSON.stringify({ version: "1.2.9" })),
  });

  assert.equal(result.publishedVersion, "1.2.9");
});

test("rejects a package version already present on the registry", async () => {
  await assert.rejects(
    checkRegistryVersion({
      packageName: "@scope/example",
      packageVersion: "1.2.9",
      fetchImpl: async () => response(200, JSON.stringify({ version: "1.2.9" })),
    }),
    /must be greater than published version 1\.2\.9/,
  );
});

test("rejects a package version older than the registry version", async () => {
  await assert.rejects(
    checkRegistryVersion({
      packageName: "@scope/example",
      packageVersion: "1.2.8",
      fetchImpl: async () => response(200, JSON.stringify({ version: "1.2.9" })),
    }),
    /must be greater than published version 1\.2\.9/,
  );
});

test("treats a registry 404 as an unpublished package", async () => {
  const result = await checkRegistryVersion({
    packageName: "@scope/new-package",
    packageVersion: "0.1.0",
    fetchImpl: async () => response(404),
  });

  assert.equal(result.publishedVersion, null);
});

test("fails closed when the registry is unavailable", async () => {
  await assert.rejects(
    checkRegistryVersion({
      packageName: "@scope/example",
      packageVersion: "1.3.0",
      fetchImpl: async () => response(503),
    }),
    /registry unavailable \(HTTP 503\); refusing to infer publishability/,
  );

  await assert.rejects(
    checkRegistryVersion({
      packageName: "@scope/example",
      packageVersion: "1.3.0",
      fetchImpl: async () => { throw new Error("offline"); },
    }),
    /registry unavailable \(offline\); refusing to infer publishability/,
  );
});

test("rejects malformed registry metadata", async () => {
  await assert.rejects(
    checkRegistryVersion({
      packageName: "@scope/example",
      packageVersion: "1.3.0",
      fetchImpl: async () => response(200, JSON.stringify({ version: "latest" })),
    }),
    /invalid version metadata/,
  );
});
