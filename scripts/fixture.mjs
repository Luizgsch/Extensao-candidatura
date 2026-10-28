import { build } from "esbuild";
import { createServer } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
export async function startFixture(port = 4175) {
  await mkdir("work", { recursive: true });
  await build({
    entryPoints: ["tests/fixtures/forms/react-controlled.jsx"],
    outfile: "work/react-fixture.js",
    bundle: true,
    platform: "browser",
    define: { "process.env.NODE_ENV": '"production"' },
  });
  const server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url ?? "/", "http://localhost").pathname;
      const file =
        path === "/rules.html"
          ? "tests/fixtures/forms/rules.html"
          : path === "/react.js"
            ? "work/react-fixture.js"
            : path === "/native.js"
              ? "tests/fixtures/forms/native.js"
              : "tests/fixtures/forms/mvp.html";
      res.setHeader(
        "Content-Type",
        file.endsWith(".js")
          ? "text/javascript; charset=utf-8"
          : "text/html; charset=utf-8",
      );
      res.end(await readFile(file));
    } catch {
      res.statusCode = 500;
      res.end("Não foi possível abrir o formulário de teste.");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return server;
}
if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  const port = Number(process.argv[2] ?? 4175);
  await startFixture(port);
  console.log("Formulário fictício: http://127.0.0.1:" + port);
}
