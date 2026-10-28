import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
const server = createServer(async (req, res) => {
  try {
    const file = resolve(
      "dist",
      "." + new URL(req.url, "http://localhost").pathname,
    );
    if (!file.startsWith(resolve("dist") + "\\")) throw Error();
    const data = await readFile(file);
    res.setHeader(
      "Content-Type",
      {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".woff2": "font/woff2",
      }[extname(file)] ?? "application/octet-stream",
    );
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end();
  }
}).listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const origin = "http://127.0.0.1:" + server.address().port;
const browser = await chromium.launch({ headless: true, channel: "msedge" });
await mkdir(".impeccable/review", { recursive: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(origin + "/settings.html");
  await page
    .getByRole("heading", { name: "Meus dados", exact: true })
    .waitFor();
  await page.screenshot({
    path: ".impeccable/review/desktop.png",
    fullPage: true,
  });
  await page
    .getByLabel("Nome completo", { exact: true })
    .fill("Pessoa de teste");
  await page
    .getByRole("button", { name: "Salvar meus dados", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Alterações aplicadas" })
    .waitFor();
  await page.getByRole("button", { name: "Experiências", exact: true }).click();
  await page.getByRole("button", { name: "Adicionar experiência" }).click();
  await page.getByLabel("Empresa ou organização").fill("Organização de teste");
  await page.getByLabel("Cargo", { exact: true }).fill("Desenvolvedor");
  await page.getByLabel("Início", { exact: true }).fill("2025-01");
  await page.getByLabel("Trabalho atual").check();
  await page
    .getByLabel("Descrição completa", { exact: true })
    .fill("Descrição de teste. ".repeat(50));
  await page.getByRole("button", { name: "Salvar registro" }).click();
  await page
    .getByRole("heading", { name: "Desenvolvedor", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Meus dados", exact: true }).click();
  if (
    (await page.getByLabel("Nome completo", { exact: true }).inputValue()) !==
    "Pessoa de teste"
  )
    throw Error("Dados perdidos");
  for (const width of [320, 375, 430]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({
      path: ".impeccable/review/mobile-" + width + ".png",
      fullPage: true,
    });
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )
    )
      throw Error("Overflow " + width);
  }

  await page
    .getByRole("button", { name: "Minhas respostas", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Adicionar resposta", exact: true })
    .click();
  await page.getByLabel("Nome interno").fill("Experiência Java");
  await page.getByLabel("Assunto", { exact: true }).fill("Java");
  await page
    .getByLabel("Palavras-chave — separadas por vírgula")
    .fill("java, experiencia java");
  await page.getByLabel("Resposta em português", { exact: true }).fill("Sim");
  await page.getByRole("button", { name: "Salvar registro" }).click();
  for (const width of [320, 375, 430]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({
      path: ".impeccable/review/list-" + width + ".png",
      fullPage: true,
    });
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )
    )
      throw Error("Lista excede " + width);
  }
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await page.getByLabel("Nome interno").fill("Edição não salva");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Desativar", exact: true }).click();
  if (
    (await page.getByLabel("Nome interno").inputValue()) !== "Edição não salva"
  )
    throw Error("Edição descartada");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  if (
    !(await page
      .getByRole("button", { name: "Adicionar resposta", exact: true })
      .evaluate((el) => document.activeElement === el))
  )
    throw Error("Foco perdido");
  await page.setViewportSize({ width: 390, height: 850 });
  await page.goto(origin + "/popup.html");
  await page.screenshot({
    path: ".impeccable/review/popup.png",
    fullPage: true,
  });
  if (
    !(await page.getByRole("button", { name: "Preencher página" }).isDisabled())
  )
    throw Error("Ação prematura");
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    "UI: navegação, cadastro, experiência, 320/375/430px e popup passaram.",
  );
} finally {
  await browser.close();
  server.close();
}
