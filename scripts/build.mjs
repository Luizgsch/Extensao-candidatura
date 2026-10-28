import { build } from "esbuild";
import { mkdir, copyFile } from "node:fs/promises";
await mkdir("dist", { recursive: true });
await build({
  entryPoints: {
    background: "src/background/service-worker.ts",
    content: "src/content/main.ts",
  },
  outdir: "dist",
  bundle: true,
  format: "iife",
  target: "chrome120",
});
await copyFile("public/manifest.json", "dist/manifest.json");
console.log("Build concluído: dist/");
