import { chromium } from "playwright";
import { createServer } from "node:http";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
const fixture =
  '<!doctype html><title>Teste de candidatura</title><form><label>Nome<input value="Original"></label><input type="email"><input type="password" value="segredo"><input type="hidden"><input disabled><input readonly><textarea></textarea><select><option>Sim</option></select><input type="file"><input style="display:none"><fieldset disabled><input></fieldset><input type="submit" value="Enviar"><button>Enviar candidatura</button><iframe src="about:blank"></iframe></form>';
const server = createServer((req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.end(fixture);
}).listen(4174, "127.0.0.1");
await mkdir("work/analysis-extension", { recursive: true });
await cp("dist", "work/analysis-extension", { recursive: true });
const manifest = JSON.parse(await readFile("dist/manifest.json", "utf8"));
// Grant ONLY the test fixture origin to exercise the full bridge without a toolbar click.
manifest.host_permissions = ["http://127.0.0.1:4174/*"];
await writeFile(
  "work/analysis-extension/manifest.json",
  JSON.stringify(manifest),
);
const extension = resolve("work/analysis-extension");
const context = await chromium.launchPersistentContext(
  "work/analysis-profile-" + Date.now(),
  {
    channel: "msedge",
    headless: true,
    args: [
      "--disable-extensions-except=" + extension,
      "--load-extension=" + extension,
    ],
  },
);
try {
  const worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker", { timeout: 15000 }));
  const id = new URL(worker.url()).hostname;
  const form = await context.newPage();
  await form.goto("http://127.0.0.1:4174");
  const popup = await context.newPage();
  await popup.goto("chrome-extension://" + id + "/popup.html");
  await form.bringToFront();
  const analyze = () =>
    popup.evaluate(() =>
      chrome.runtime.sendMessage({ type: "ANALYZE_ACTIVE_TAB" }),
    );
  const first = await analyze();
  assert.equal(first.ok, true);
  assert.equal(first.analysis.fieldsFound, 8);
  assert.equal(first.analysis.editableFields, 4);
  assert.equal(first.analysis.manualUploads, 1);
  assert.equal(first.analysis.embeddedFrames, 1);
  assert.deepEqual(await analyze(), first);
  assert.equal(await form.locator("input").first().inputValue(), "Original");
  await popup.evaluate(() => document.querySelector("#analyze").click());
  await popup.waitForFunction(
    () => document.querySelector("#found")?.textContent === "8",
  );
  assert.equal(await popup.locator("#editable").textContent(), "4");
  assert.equal(
    await popup.getByRole("button", { name: "Preencher página" }).isDisabled(),
    false,
  );
  await popup.setViewportSize({ width: 370, height: 600 });
  await popup.screenshot({
    path: ".impeccable/review/popup-analysis.png",
    fullPage: true,
  });
  const protectedPage = await context.newPage();
  await protectedPage.goto("edge://version");
  await protectedPage.bringToFront();
  const blocked = await analyze();
  assert.equal(blocked.ok, false);
  assert.match(blocked.error, /página|protegida|autorizar/);
  console.log(
    "Análise real: contagens, somente leitura, repetição, popup e página protegida passaram. Permissão de host aplicada somente à fixture isolada.",
  );
} finally {
  await context.close();
  server.close();
}
