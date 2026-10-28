import { chromium } from "playwright";
import { startFixture } from "./fixture.mjs";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { createDefaultState } from "../src/defaults/state.ts";
const server = await startFixture(0),
  origin = "http://127.0.0.1:" + server.address().port;
await mkdir("work/rules-extension", { recursive: true });
await cp("dist", "work/rules-extension", { recursive: true });
const manifest = JSON.parse(await readFile("dist/manifest.json", "utf8"));
manifest.host_permissions = [origin + "/*"];
await writeFile("work/rules-extension/manifest.json", JSON.stringify(manifest));
const extension = resolve("work/rules-extension");
const context = await chromium.launchPersistentContext(
  "work/rules-profile-" + Date.now(),
  {
    channel: "msedge",
    headless: true,
    args: [
      "--disable-extensions-except=" + extension,
      "--load-extension=" + extension,
    ],
  },
);
const makeRule = (id, subject, answer, keywords = [subject]) => ({
  id,
  name: id,
  category: "Teste",
  subject,
  keywords,
  excludedKeywords: [],
  answer,
  enabled: true,
  priority: 0,
  insertion: answer.type === "long-text" ? "suggestion" : "automatic",
});
try {
  const worker =
      context.serviceWorkers()[0] ??
      (await context.waitForEvent("serviceworker", { timeout: 15000 })),
    id = new URL(worker.url()).hostname;
  const popup = await context.newPage();
  await popup.setViewportSize({ width: 370, height: 600 });
  await popup.goto("chrome-extension://" + id + "/popup.html");
  const state = createDefaultState();
  state.synonyms = {
    "pt-BR": { relocation: ["mudança", "mudar de cidade"] },
    en: { relocation: ["relocate", "relocation"] },
  };
  state.candidate.email = { type: "email", value: "pessoa@example.test" };
  state.profiles = [
    {
      id: "backend",
      name: "Backend de teste",
      technologies: [],
      introduction: {},
      experienceIds: [],
      answerOverrides: {},
    },
  ];
  state.rules = [
    makeRule("java-bool", "Java", { type: "boolean", value: true }, [
      "java",
      "experiencia java",
    ]),
    makeRule("java-years", "Java", { type: "experience-years", value: 2 }, [
      "java",
      "anos java",
    ]),
    {
      ...makeRule("sql", "SQL", { type: "boolean", value: true }),
      enabled: false,
    },
    makeRule("docker-a", "Docker", { type: "boolean", value: true }),
    {
      ...makeRule("docker-b", "Docker", { type: "boolean", value: false }),
      priority: 100,
    },
    makeRule("relocation", "mudança", { type: "boolean", value: true }),
    makeRule(
      "story",
      "Apresentação",
      { type: "long-text", value: { "pt-BR": "Apresentação fictícia salva." } },
      ["Conte sobre você"],
    ),
    makeRule(
      "story-en",
      "Java",
      { type: "long-text", value: { en: "Saved fictional Java story." } },
      ["Tell us about your experience with Java"],
    ),
    makeRule(
      "missing",
      "Java",
      { type: "long-text", value: { "pt-BR": "Sem tradução inglesa." } },
      ["Describe Java experience"],
    ),
    {
      ...makeRule("rust", "Rust", { type: "boolean", value: true }),
      profileIds: ["backend"],
    },
    {
      ...makeRule("go", "Go", { type: "boolean", value: true }),
      domains: ["other.test"],
    },
    makeRule(
      "salary",
      "pretensão salarial",
      { type: "salary", value: 2000, currency: "BRL", period: "month" },
      ["Qual sua pretensão salarial anual USD?"],
    ),
  ];
  await popup.evaluate(
    (state) =>
      chrome.storage.local.set({
        applicationState: state,
        selectedProfileId: "backend",
      }),
    state,
  );
  const page = await context.newPage();
  await page.goto(origin + "/rules.html");
  await page.locator("#java-bool").waitFor();
  const command = async (type, suggestionId) => {
    await page.bringToFront();
    return popup.evaluate(
      ({ type, suggestionId }) =>
        chrome.runtime.sendMessage({
          type,
          ...(suggestionId ? { suggestionId } : {}),
        }),
      { type, suggestionId },
    );
  };
  const first = await command("FILL_ACTIVE_TAB");
  assert.equal(first.ok, true);
  assert.equal(await page.locator("#java-bool").inputValue(), "Sim");
  assert.equal(await page.locator("#java-years").inputValue(), "2");
  assert.equal(await page.locator("#known-years").inputValue(), "2");
  assert.equal(await page.locator("#java-bool-en").inputValue(), "Yes");
  assert.equal(await page.locator("#java-years-en").inputValue(), "2");
  assert.equal(await page.locator("#relocation").inputValue(), "Sim");
  assert.equal(await page.locator("#relocation-en").inputValue(), "Yes");
  assert.equal(await page.locator("#rust").inputValue(), "Sim");
  for (const field of [
    "custom-combobox",
    "transparent-rule",
    "transparent-parent",
    "transparent-email",
    "willing-java",
    "negative",
    "threshold",
    "compound",
    "certification",
    "javascript",
    "sql",
    "docker",
    "go",
    "otp",
    "reference",
    "invalid-years",
    "salary",
    "story",
    "story-en",
    "missing-translation",
  ])
    assert.equal(await page.locator("#" + field).inputValue(), "", field);
  assert.ok(
    first.report.items.some(
      (item) =>
        item.ruleName === "docker-b" && item.reason.includes("ambíguas"),
    ),
  );
  assert.ok(
    first.report.items.some(
      (item) =>
        item.suggestionId && item.suggestionPreview.includes("Apresentação"),
    ),
  );
  await popup.reload();
  await popup.waitForFunction(() =>
    document
      .querySelector("#field-results")
      .textContent.includes("Apresentação"),
  );
  await popup
    .locator("#field-details")
    .evaluate((element) => (element.open = true));
  await mkdir(".impeccable/review", { recursive: true });
  await popup.screenshot({
    path: ".impeccable/review/rules-popup.png",
    fullPage: true,
  });
  await popup.setViewportSize({ width: 320, height: 600 });
  await popup.screenshot({
    path: ".impeccable/review/rules-popup-320.png",
    fullPage: true,
  });
  assert.equal(
    await popup.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await popup.setViewportSize({ width: 370, height: 600 });
  await popup
    .getByRole("button", {
      name: "Inserir sugestão: Conte sobre você",
      exact: true,
    })
    .evaluate((button) => button.scrollIntoView({ block: "nearest" }));
  await popup.screenshot({
    path: ".impeccable/review/rules-suggestion.png",
    fullPage: true,
  });
  const story = first.report.items.find(
    (item) => item.suggestionPreview === "Apresentação fictícia salva.",
  );
  assert.ok(story.suggestionId);
  await page.locator("#story").evaluate((element) => (element.hidden = true));
  assert.equal(
    (await command("APPLY_SUGGESTION_ACTIVE_TAB", story.suggestionId)).ok,
    false,
  );
  await page.locator("#story").evaluate((element) => (element.hidden = false));
  await page
    .locator("#story")
    .evaluate((element) => (element.style.opacity = "0"));
  assert.equal(
    (await command("APPLY_SUGGESTION_ACTIVE_TAB", story.suggestionId)).ok,
    false,
  );
  await page
    .locator("#story")
    .evaluate((element) => (element.style.opacity = ""));
  await page
    .locator("#story")
    .evaluate((element) => (element.parentElement.style.opacity = "0"));
  assert.equal(
    (await command("APPLY_SUGGESTION_ACTIVE_TAB", story.suggestionId)).ok,
    false,
  );
  await page
    .locator("#story")
    .evaluate((element) => (element.parentElement.style.opacity = ""));
  await page.locator("#story").fill("Texto manual");
  const edited = await command(
    "APPLY_SUGGESTION_ACTIVE_TAB",
    story.suggestionId,
  );
  assert.equal(edited.ok, false);
  assert.equal(await page.locator("#story").inputValue(), "Texto manual");
  await page.locator("#story").fill("");
  state.rules.find((rule) => rule.id === "story").enabled = false;
  await popup.evaluate(
    (state) => chrome.storage.local.set({ applicationState: state }),
    state,
  );
  assert.equal(
    (await command("APPLY_SUGGESTION_ACTIVE_TAB", story.suggestionId)).ok,
    false,
  );
  state.rules.find((rule) => rule.id === "story").enabled = true;
  state.rules.find((rule) => rule.id === "story").answer.value["pt-BR"] =
    "Texto alterado após prévia";
  await popup.evaluate(
    (state) => chrome.storage.local.set({ applicationState: state }),
    state,
  );
  assert.equal(
    (await command("APPLY_SUGGESTION_ACTIVE_TAB", story.suggestionId)).ok,
    false,
  );
  state.rules.find((rule) => rule.id === "story").answer.value["pt-BR"] =
    "Apresentação fictícia salva.";
  await popup.evaluate(
    (state) => chrome.storage.local.set({ applicationState: state }),
    state,
  );
  await page.bringToFront();
  await popup
    .getByRole("button", {
      name: "Inserir sugestão: Conte sobre você",
      exact: true,
    })
    .evaluate((button) => button.click());
  await page.waitForFunction(
    () =>
      document.querySelector("#story").value === "Apresentação fictícia salva.",
  );
  const undone = await command("UNDO_ACTIVE_TAB");
  assert.equal(undone.undo.restored, 1);
  assert.equal(await page.locator("#story").inputValue(), "");
  assert.equal(await page.locator("#java-bool").inputValue(), "Sim");
  await page.reload();
  await popup.evaluate(() => chrome.storage.local.remove("selectedProfileId"));
  await command("FILL_ACTIVE_TAB");
  assert.equal(await page.locator("#rust").inputValue(), "");
  await page.reload();
  state.settings.confidence.automaticMinimum = 99;
  await popup.evaluate(
    (state) => chrome.storage.local.set({ applicationState: state }),
    state,
  );
  const medium = await command("FILL_ACTIVE_TAB");
  assert.equal(await page.locator("#java-bool").inputValue(), "");
  assert.ok(medium.report.items.some((item) => item.suggestionId));
  await page.reload();
  state.settings.confidence.fillMediumConfidence = true;
  await popup.evaluate(
    (state) => chrome.storage.local.set({ applicationState: state }),
    state,
  );
  const highlighted = await command("FILL_ACTIVE_TAB");
  assert.equal(await page.locator("#java-bool").inputValue(), "Sim");
  assert.ok(
    highlighted.report.items.some((item) =>
      item.reason.includes("intermediária"),
    ),
  );

  const settings = await context.newPage();
  await settings.setViewportSize({ width: 1440, height: 1000 });
  await settings.goto("chrome-extension://" + id + "/settings.html");
  await settings
    .getByRole("button", { name: "Minhas respostas", exact: true })
    .click();
  await settings
    .getByRole("button", { name: "Adicionar resposta", exact: true })
    .click();
  await settings.getByLabel("Nome interno").fill("Disponibilidade para viagem");
  await settings.getByLabel("Assunto", { exact: true }).fill("viagem");
  await settings
    .getByLabel("Palavras-chave — separadas por vírgula")
    .fill("viagem, disponibilidade viagem");
  await settings
    .getByLabel("Onde usar", { exact: true })
    .selectOption("limited");
  await settings
    .getByLabel("Sites permitidos — domínios separados por vírgula")
    .fill("127.0.0.1");
  await settings
    .getByLabel("Inserção", { exact: true })
    .selectOption("suggestion");
  await settings
    .getByLabel("Tipo de resposta", { exact: true })
    .selectOption("boolean");
  await settings
    .getByLabel("Resposta em português", { exact: true })
    .fill("Sim");
  await settings.screenshot({
    path: ".impeccable/review/rules-editor-desktop.png",
    fullPage: true,
  });
  await settings.setViewportSize({ width: 375, height: 900 });
  await settings.screenshot({
    path: ".impeccable/review/rules-editor-mobile.png",
    fullPage: true,
  });
  assert.equal(
    await settings.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await settings
    .getByRole("button", { name: "Salvar registro", exact: true })
    .click();
  await settings
    .getByRole("status")
    .filter({ hasText: "Alterações salvas" })
    .waitFor();
  const saved = (
    await settings.evaluate(
      async () =>
        (await chrome.storage.local.get("applicationState")).applicationState,
    )
  ).rules.find((rule) => rule.name === "Disponibilidade para viagem");
  assert.deepEqual(saved.domains, ["127.0.0.1"]);
  assert.equal(saved.insertion, "suggestion");
  await page.reload();
  const withUserRule = await command("FILL_ACTIVE_TAB");
  assert.equal(await page.locator("#travel").inputValue(), "");
  const travel = withUserRule.report.items.find(
    (item) => item.ruleName === "Disponibilidade para viagem",
  );
  assert.ok(travel.suggestionId);
  assert.equal(
    (await command("APPLY_SUGGESTION_ACTIVE_TAB", travel.suggestionId)).ok,
    true,
  );
  assert.equal(await page.locator("#travel").inputValue(), "Sim");
  await command("UNDO_ACTIVE_TAB");
  assert.equal(await page.locator("#travel").inputValue(), "");
  assert.equal(await page.locator("#terms").isChecked(), false);
  assert.equal(await page.evaluate(() => window.submissions), 0);
  console.log(
    "Regras reais no Edge: PT/EN, sim/não vs anos, sinônimos, ambiguidades, escopos, médias, sugestões, revalidação, textarea, desfazer e ausência de envio passaram.",
  );
} finally {
  await context.close();
  server.close();
}
