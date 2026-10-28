import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const root = resolve("dist");
createServer(async (req, res) => {
  try {
    const path = new URL(req.url ?? "/", "http://localhost").pathname;
    const file = resolve(root, "." + (path === "/" ? "/settings.html" : path));
    if (!file.startsWith(root + sep)) throw Error("Invalid path");
    const data = await readFile(file);
    res.setHeader(
      "Content-Type",
      {
        ".html": "text/html; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".woff2": "font/woff2",
      }[extname(file)] ?? "application/octet-stream",
    );
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end("Página não encontrada");
  }
}).listen(4173, "127.0.0.1", () =>
  console.log("Prévia: http://127.0.0.1:4173"),
);
