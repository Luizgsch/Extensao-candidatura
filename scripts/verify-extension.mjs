import { chromium } from "playwright";
import { resolve } from "node:path";
const context = await chromium.launchPersistentContext("work/extension-check", {
  channel: "msedge",
  headless: true,
  args: [
    "--disable-extensions-except=" + resolve("dist"),
    "--load-extension=" + resolve("dist"),
  ],
});
try {
  const worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker", { timeout: 15000 }));
  const id = new URL(worker.url()).hostname;
  const page = await context.newPage();
  await page.goto("chrome-extension://" + id + "/settings.html");
  await page
    .getByRole("heading", { name: "Meus dados", exact: true })
    .waitFor();
  await page
    .getByLabel("Nome completo", { exact: true })
    .fill("Teste de persistência");
  await page
    .getByRole("button", { name: "Salvar meus dados", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Alterações salvas" })
    .waitFor();
  await page.reload();
  if (
    (await page.getByLabel("Nome completo", { exact: true }).inputValue()) !==
    "Teste de persistência"
  )
    throw Error("Persistência falhou");
  console.log(
    "Extensão real no Edge: service worker, configurações e persistência passaram.",
  );
} finally {
  await context.close();
}
