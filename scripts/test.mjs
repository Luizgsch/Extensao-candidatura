import { build } from "esbuild";
import { spawnSync } from "node:child_process";
await build({
  entryPoints: ["tests/core.test.ts"],
  outfile: "work/core.test.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
});
process.exitCode =
  spawnSync(process.execPath, ["--test", "work/core.test.mjs"], {
    stdio: "inherit",
  }).status ?? 1;
