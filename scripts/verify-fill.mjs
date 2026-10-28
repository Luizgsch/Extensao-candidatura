import { chromium } from "playwright";
import { startFixture } from "./fixture.mjs";

import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { createDefaultState } from "../src/defaults/state.ts";
const server = await startFixture(0);
const origin = "http://127.0.0.1:" + server.address().port;
await mkdir("work/fill-extension", { recursive: true });
await cp("dist", "work/fill-extension", { recursive: true });
const manifest = JSON.parse(await readFile("dist/manifest.json", "utf8"));
manifest.host_permissions = [origin + "/*"];
await writeFile("work/fill-extension/manifest.json", JSON.stringify(manifest));
const extension = resolve("work/fill-extension");
const context = await chromium.launchPersistentContext(
  "work/fill-profile-" + Date.now(),
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
  const popup = await context.newPage();
  await popup.setViewportSize({ width: 370, height: 600 });
  await popup.goto("chrome-extension://" + id + "/popup.html");
  const state = createDefaultState();
  state.candidate = {
    fullName: { type: "text", value: { "pt-BR": "Pessoa de Teste" } },
    firstName: { type: "text", value: { "pt-BR": "Pessoa" } },
    lastName: { type: "text", value: { "pt-BR": "de Teste" } },
    email: { type: "email", value: "pessoa@example.test" },
    phone: { type: "phone", value: "+55 (41) 99999-0000" },
    portfolio: { type: "url", value: "https://example.test" },
    github: { type: "url", value: "https://github.com/example" },
    birthDate: { type: "date", value: "2000-01-01" },
    city: { type: "text", value: { "pt-BR": "Cidade de teste" } },
    state: { type: "text", value: { "pt-BR": "PR" } },
    country: { type: "text", value: { "pt-BR": "Brasil" } },
  };
  await popup.evaluate(
    (state) => chrome.storage.local.set({ applicationState: state }),
    state,
  );
  const page = await context.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(origin);
  await page.locator("#react-name").waitFor();
  const command = async (type) => {
    await page.bringToFront();
    return popup.evaluate((type) => chrome.runtime.sendMessage({ type }), type);
  };
  await page.locator("#unknown").focus();
  const first = await command("FILL_ACTIVE_TAB");
  assert.equal(first.ok, true);
  assert.ok(first.report.filled >= 9);
  assert.ok(first.report.review >= 3);
  assert.ok(first.report.failed >= 2);
  assert.equal(first.report.undoAvailable, true);
  assert.equal(await page.locator("#fullName").inputValue(), "Pessoa de Teste");
  assert.equal(await page.locator("#lastName").inputValue(), "de Teste");
  assert.equal(
    await page.locator("#confirmEmail").inputValue(),
    "pessoa@example.test",
  );
  assert.equal(
    await page.locator("#react-state").textContent(),
    "Pessoa de Teste",
  );
  assert.equal(await page.locator("#birthDate").inputValue(), "2000-01-01");
  for (const key of [
    "ambiguous",
    "otp",
    "unknown",
    "essay",
    "reference-name",
    "rejected-city",
    "invalid-phone",
    "linkedin",
    "national-phone",
    "short-first-name",
    "password",
    "hidden",
  ])
    assert.equal(await page.locator("#" + key).inputValue(), "");
  assert.equal(await page.locator("#city").inputValue(), "Cidade já informada");
  assert.equal(await page.locator("#state").inputValue(), "PR");
  assert.equal(await page.locator("#terms").isChecked(), false);
  assert.equal(await page.locator("#resume").inputValue(), "");
  assert.equal(await page.evaluate(() => window.submissions), 0);
  assert.ok(
    await page.evaluate(
      () => window.inputEvents > 0 && window.changeEvents > 0,
    ),
  );
  assert.equal(await page.evaluate(() => document.activeElement.id), "unknown");
  assert.equal(
    await page.locator("#fullName").getAttribute("style"),
    "outline: 1px dotted #555",
  );
  await popup.reload();
  await page.bringToFront();
  await popup.waitForFunction(
    () => Number(document.querySelector("#filled").textContent) >= 9,
  );
  await mkdir(".impeccable/review", { recursive: true });
  await popup.screenshot({
    path: ".impeccable/review/fill-popup.png",
    fullPage: true,
  });
  await popup.setViewportSize({ width: 320, height: 600 });
  await popup.screenshot({
    path: ".impeccable/review/fill-popup-320.png",
    fullPage: true,
  });
  assert.equal(
    await popup.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await popup.setViewportSize({ width: 370, height: 600 });

  await popup.evaluate(() => document.querySelector("#analyze").click());
  await popup.waitForFunction(
    () => document.querySelector("#found").textContent !== "—",
  );
  // Reopening retrieves undo state; retrieve explicitly after reload test focus is back on the form.
  const session = await command("GET_ACTIVE_SESSION");
  assert.equal(session.session.undoAvailable, true);
  await popup.evaluate(() => document.querySelector("#fill").click());
  await popup.waitForFunction(() =>
    document
      .querySelector("#status")
      .textContent.includes("campo(s) preenchido(s)"),
  );
  await mkdir(".impeccable/review", { recursive: true });
  await popup.screenshot({
    path: ".impeccable/review/fill-repeat-popup.png",
    fullPage: true,
  });
  await page.screenshot({
    path: ".impeccable/review/fill-form.png",
    fullPage: true,
  });
  await page.locator("#fullName").fill("Edição manual");
  const undo = await command("UNDO_ACTIVE_TAB");
  assert.equal(undo.ok, true);
  assert.equal(undo.undo.conflicts, 1);
  assert.ok(undo.undo.restored >= 9);
  assert.equal(await page.locator("#fullName").inputValue(), "Edição manual");
  assert.equal(await page.locator("#firstName").inputValue(), "");
  assert.equal(await page.locator("#react-state").textContent(), "");
  assert.equal(await page.locator("#masked-phone").inputValue(), "");
  const again = await command("FILL_ACTIVE_TAB");
  assert.ok(again.report.filled > 0);
  await page
    .getByRole("button", { name: "Adicionar campo", exact: true })
    .click();
  const dynamic = await command("FILL_ACTIVE_TAB");
  assert.equal(dynamic.report.filled, 1);
  assert.equal(
    await page.locator("#github").inputValue(),
    "https://github.com/example",
  );
  await command("UNDO_ACTIVE_TAB");
  assert.equal(await page.locator("#github").inputValue(), "");
  assert.equal(await page.locator("#firstName").inputValue(), "Pessoa");
  await page.reload();
  await page.locator("#react-name").waitFor();
  const fresh = await command("GET_ACTIVE_SESSION");
  assert.equal(fresh.session.undoAvailable, false);
  state.settings.confidence.automaticMinimum = 100;
  await popup.evaluate(
    (state) => chrome.storage.local.set({ applicationState: state }),
    state,
  );
  const strict = await command("FILL_ACTIVE_TAB");
  assert.equal(strict.report.filled, 0);
  state.settings.confidence.automaticMinimum = 90;
  state.settings.preserveExisting = false;
  await popup.evaluate(
    (state) => chrome.storage.local.set({ applicationState: state }),
    state,
  );
  const replace = await command("FILL_ACTIVE_TAB");
  assert.ok(replace.report.filled > 0);
  assert.equal(await page.locator("#city").inputValue(), "Cidade de teste");
  await command("UNDO_ACTIVE_TAB");
  assert.equal(await page.locator("#city").inputValue(), "Cidade já informada");
  assert.equal(await page.evaluate(() => window.submissions), 0);
  console.log(
    "MVP real no Edge: PT/EN, React controlado, eventos, ambiguidades, segredos, terceiros, preservação, limites, campos novos, desfazer e envio manual passaram. Host de teste autorizado apenas no pacote isolado.",
  );
} finally {
  await context.close();
  server.close();
}
