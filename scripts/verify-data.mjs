import { chromium } from "playwright";
import { resolve } from "node:path";
import { readFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const extension = resolve("dist");
const context = await chromium.launchPersistentContext(
  "work/data-profile-" + Date.now(),
  {
    channel: "msedge",
    headless: true,
    acceptDownloads: true,
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
  const page = await context.newPage();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("chrome-extension://" + id + "/settings.html");
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page
    .getByLabel("Nome completo", { exact: true })
    .fill("Pessoa de teste");
  await page.getByLabel("Pretensão salarial mensal (BRL)").fill("2000");
  await page.getByLabel("Disponibilidade para mudança").selectOption("true");
  await page
    .getByRole("button", { name: "Salvar meus dados", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Alterações salvas" })
    .waitFor();
  const saved = await page.evaluate(
    async () =>
      (await chrome.storage.local.get("applicationState")).applicationState,
  );
  assert.equal(saved.candidate.salaryExpectation.value, 2000);
  assert.equal(saved.candidate.relocation.value, true);
  await page.getByRole("button", { name: "Privacidade", exact: true }).click();
  let downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exportar preferências", exact: true })
    .click();
  let download = await downloading;
  const prefs = JSON.parse(await readFile(await download.path(), "utf8"));
  assert.deepEqual(prefs.data.candidate, {});
  page.once("dialog", (dialog) => dialog.accept());
  downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exportar backup completo", exact: true })
    .click();
  download = await downloading;
  const full = JSON.parse(await readFile(await download.path(), "utf8"));
  assert.equal(full.data.candidate.fullName.value["pt-BR"], "Pessoa de teste");
  assert.deepEqual(full.data.logs, []);
  await page.locator("#import-file").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from("{"),
  });
  await page.getByRole("status").filter({ hasText: "JSON inválido" }).waitFor();
  assert.deepEqual(
    await page.evaluate(
      async () =>
        (await chrome.storage.local.get("applicationState")).applicationState,
    ),
    saved,
  );
  full.data.candidate.fullName.value["pt-BR"] = "Pessoa importada";
  full.data.candidate.salaryExpectation = {
    type: "salary",
    value: 2000,
    currency: "USD",
    period: "year",
  };
  full.data.candidate.professionalArea = {
    type: "text",
    value: { "pt-BR": "Backend", en: "Backend English" },
  };
  full.data.candidate.englishLevel = {
    type: "single-choice",
    value: "Intermediate",
  };
  full.data.experiences = [
    {
      id: "exp-test",
      organization: "Teste",
      role: "Cargo",
      startMonth: "2025-01",
      current: true,
      shortDescription: { "pt-BR": "Curta", en: "Short" },
      fullDescription: { "pt-BR": "Completa", en: "Full" },
      activities: [
        { "pt-BR": "Atividade", en: "Activity" },
        { en: "English only" },
      ],
    },
  ];

  await page.locator("#import-file").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(full)),
  });
  await page
    .getByRole("button", { name: "Substituir dados pelo backup" })
    .waitFor();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("button", { name: "Substituir dados pelo backup" })
    .click();
  assert.equal(
    (
      await page.evaluate(
        async () =>
          (await chrome.storage.local.get("applicationState")).applicationState,
      )
    ).candidate.fullName.value["pt-BR"],
    "Pessoa de teste",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Substituir dados pelo backup" })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Alterações salvas" })
    .waitFor();
  await page.reload();
  await page.getByRole("button", { name: "Meus dados", exact: true }).waitFor();
  assert.equal(
    await page.getByLabel("Nome completo", { exact: true }).inputValue(),
    "Pessoa importada",
  );

  await page
    .getByLabel("Nome completo", { exact: true })
    .fill("Pessoa editada");
  await page
    .getByRole("button", { name: "Salvar meus dados", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Alterações salvas" })
    .waitFor();
  const edited = await page.evaluate(
    async () =>
      (await chrome.storage.local.get("applicationState")).applicationState,
  );
  assert.deepEqual(
    edited.candidate.salaryExpectation,
    full.data.candidate.salaryExpectation,
  );
  assert.deepEqual(
    edited.candidate.professionalArea,
    full.data.candidate.professionalArea,
  );
  assert.deepEqual(
    edited.candidate.englishLevel,
    full.data.candidate.englishLevel,
  );
  await page.getByRole("button", { name: "Experiências", exact: true }).click();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await page.getByLabel("Cargo", { exact: true }).fill("Cargo atualizado");
  await page
    .getByRole("button", { name: "Salvar registro", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Alterações salvas" })
    .waitFor();
  const exp = (
    await page.evaluate(
      async () =>
        (await chrome.storage.local.get("applicationState")).applicationState,
    )
  ).experiences[0];
  assert.equal(exp.shortDescription.en, "Short");
  assert.equal(exp.activities[0].en, "Activity");
  assert.equal(exp.activities[1].en, "English only");
  const stale = await context.newPage();
  await stale.goto("chrome-extension://" + id + "/settings.html");
  await stale
    .getByLabel("Nome completo", { exact: true })
    .fill("Edição desatualizada");
  await page.getByRole("button", { name: "Meus dados", exact: true }).click();
  await page.getByLabel("Pretensão salarial anual (USD)").fill("2500");
  await page
    .getByRole("button", { name: "Salvar meus dados", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Alterações salvas" })
    .waitFor();
  await stale
    .getByRole("button", { name: "Salvar meus dados", exact: true })
    .click();
  await stale
    .getByRole("status")
    .filter({ hasText: "alterados em outra aba" })
    .waitFor();
  assert.equal(
    (
      await page.evaluate(
        async () =>
          (await chrome.storage.local.get("applicationState")).applicationState,
      )
    ).candidate.salaryExpectation.value,
    2500,
  );
  await stale.close();

  await page.getByRole("button", { name: "Privacidade", exact: true }).click();
  await page.locator("#import-file").setInputFiles({
    name: "prefs.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(prefs)),
  });
  await page
    .getByRole("button", { name: "Importar preferências", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Alterações salvas" })
    .waitFor();
  assert.equal(
    (
      await page.evaluate(
        async () =>
          (await chrome.storage.local.get("applicationState")).applicationState,
      )
    ).candidate.fullName.value["pt-BR"],
    "Pessoa editada",
  );
  await mkdir(".impeccable/review", { recursive: true });
  await page.screenshot({
    path: ".impeccable/review/data-desktop.png",
    fullPage: true,
  });
  for (const width of [320, 375, 430]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({
      path: ".impeccable/review/data-" + width + ".png",
      fullPage: true,
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
  }
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Restaurar preferências", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Alterações salvas" })
    .waitFor();
  assert.equal(
    (
      await page.evaluate(
        async () =>
          (await chrome.storage.local.get("applicationState")).applicationState,
      )
    ).candidate.fullName.value["pt-BR"],
    "Pessoa editada",
  );
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("button", { name: "Apagar todos os dados", exact: true })
    .click();
  assert.ok(
    (await page.evaluate(() => chrome.storage.local.get(null)))
      .applicationState,
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Apagar todos os dados", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Todos os dados" })
    .waitFor();
  assert.deepEqual(
    await page.evaluate(() => chrome.storage.local.get(null)),
    {},
  );
  await page.reload();
  assert.equal(
    await page.getByLabel("Nome completo", { exact: true }).inputValue(),
    "",
  );

  await page.evaluate(() =>
    chrome.storage.local.set({ applicationState: { schemaVersion: 99 } }),
  );
  await page.reload();
  await page
    .getByRole("heading", { name: "Seus dados foram preservados." })
    .waitFor();
  page.once("dialog", (dialog) => dialog.accept());
  const recovering = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Baixar cópia para recuperação" })
    .click();
  const recovery = await recovering;
  const raw = JSON.parse(await readFile(await recovery.path(), "utf8"));
  assert.equal(raw.applicationState.schemaVersion, 99);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Apagar dados e recomeçar" }).click();
  await page
    .getByRole("heading", { name: "Meus dados", exact: true })
    .waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "Dados: exportações, importação validada, cancelamento, persistência, preferências, exclusão e 320/375/430px passaram.",
  );
} finally {
  await context.close();
}
