import { build } from "esbuild";
import { mkdir, copyFile } from "node:fs/promises";
await mkdir("dist/fonts", { recursive: true });
await build({
  entryPoints: {
    background: "src/background/service-worker.ts",
    content: "src/content/main.ts",
    settings: "src/ui/settings.ts",
    popup: "src/ui/popup.ts",
  },
  outdir: "dist",
  bundle: true,
  minify: true,
  format: "iife",
  target: "chrome120",
});
for (const file of ["settings.html", "popup.html", "styles.css"])
  await copyFile("src/ui/" + file, "dist/" + file);
await copyFile(
  "node_modules/@fontsource/newsreader/files/newsreader-latin-400-normal.woff2",
  "dist/fonts/newsreader.woff2",
);
await copyFile(
  "node_modules/@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff2",
  "dist/fonts/dm-sans.woff2",
);
await copyFile(
  "node_modules/@fontsource/newsreader/LICENSE",
  "dist/fonts/newsreader-LICENSE.txt",
);
await copyFile(
  "node_modules/@fontsource/dm-sans/LICENSE",
  "dist/fonts/dm-sans-LICENSE.txt",
);
await copyFile("public/manifest.json", "dist/manifest.json");
console.log("Build concluído: dist/");
