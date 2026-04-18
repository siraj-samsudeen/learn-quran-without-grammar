import { test } from "node:test";
import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_SCRIPT = join(__dirname, "..", "seed-from-sqlite.mjs");
const RESET_SCRIPT = join(__dirname, "..", "reset-lesson-phases.mjs");

function runWithoutToken(script) {
  const env = { ...process.env };
  delete env.INSTANT_APP_ADMIN_TOKEN;
  return spawnSync("node", [script, "--dry-run"], {
    env,
    encoding: "utf8",
  });
}

test("seed-from-sqlite.mjs exits 1 when INSTANT_APP_ADMIN_TOKEN is unset", () => {
  const result = runWithoutToken(SEED_SCRIPT);
  assert.equal(result.status, 1, `stdout=${result.stdout}\nstderr=${result.stderr}`);
  assert.match(result.stderr, /Set INSTANT_APP_ADMIN_TOKEN/);
});

test.skip(
  "reset-lesson-phases.mjs exits 1 when INSTANT_APP_ADMIN_TOKEN is unset (enabled in Task 5)",
  () => {
    // Skipped until Task 5 migrates reset-lesson-phases.mjs to createAdminDb().
    // While the hardcoded token fallback is in that script, running this test
    // performs a live mutation against production InstantDB before hitting the
    // failing assertion.
    const result = runWithoutToken(RESET_SCRIPT);
    assert.equal(result.status, 1, `stdout=${result.stdout}\nstderr=${result.stderr}`);
    assert.match(result.stderr, /Set INSTANT_APP_ADMIN_TOKEN/);
  },
);
