import { build } from "esbuild";
import { mkdir, copyFile, readFile, rm } from "node:fs/promises";
const personalBuild = process.argv.includes("--personal");
await mkdir("dist/fonts", { recursive: true });
await rm("dist/personal-preset.local.json", { force: true });
if (personalBuild) {
  const { parseState } = await import("../src/storage/schema.ts");
  parseState(
    JSON.parse(await readFile("private/personal-preset.local.json", "utf8")),
  );
}

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
  define: { __PERSONAL_PRESET__: JSON.stringify(personalBuild) },
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
if (personalBuild)
  await copyFile(
    "private/personal-preset.local.json",
    "dist/personal-preset.local.json",
  );
console.log(
  personalBuild
    ? "Versão pessoal local compilada em dist/. Não distribuir esta pasta."
    : "Versão pública compilada em dist/, sem cadastro pessoal.",
);
