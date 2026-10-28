import { createDefaultState } from "../defaults/state";
import { isPageAnalysis, type AnalysisResponse } from "../shared/messaging";
import { personalKeys } from "../core/matching/personal-fields";
import { parseState } from "../storage/schema";
import { isFillReport } from "../shared/filling";
export type TabOperation =
  | "ANALYZE_ACTIVE_TAB"
  | "FILL_ACTIVE_TAB"
  | "UNDO_ACTIVE_TAB"
  | "GET_ACTIVE_SESSION";
export async function actOnActiveTab(
  operation: TabOperation,
): Promise<unknown> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url)
    return {
      ok: false,
      error:
        "Abra a candidatura e clique no ícone da extensão nessa aba para autorizar acesso.",
    };
  let url: URL;
  try {
    url = new URL(tab.url);
  } catch {
    return { ok: false, error: "Endereço da página inválido." };
  }
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.hostname === "chromewebstore.google.com" ||
    (url.hostname === "chrome.google.com" &&
      url.pathname.startsWith("/webstore"))
  )
    return {
      ok: false,
      error:
        "Esta página é protegida pelo navegador. Abra um site de candidatura.",
    };
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, frameIds: [0] },
      files: ["content.js"],
    });
    const send = (message: unknown) =>
      chrome.tabs.sendMessage(tab.id!, message, {
        frameId: 0,
      }) as Promise<unknown>;
    if (operation === "ANALYZE_ACTIVE_TAB") {
      const result = await send({ type: "INSPECT_PAGE" });
      return isPageAnalysis(result)
        ? { ok: true, analysis: result }
        : { ok: false, error: "Análise inválida. Tente novamente." };
    }
    if (operation === "GET_ACTIVE_SESSION")
      return { ok: true, session: await send({ type: "GET_PAGE_SESSION" }) };
    if (operation === "UNDO_ACTIVE_TAB") {
      const result = await send({ type: "UNDO_PERSONAL_FIELDS" });
      return { ok: true, ...(result as object) };
    }
    const keys = await send({ type: "PLAN_PERSONAL_FIELDS" });
    if (
      !Array.isArray(keys) ||
      !keys.every(
        (key) => typeof key === "string" && personalKeys.includes(key),
      )
    )
      return {
        ok: false,
        error: "Plano de campos inválido. Nenhum dado foi enviado.",
      };
    const stored = await chrome.storage.local.get("applicationState");
    const state =
      stored.applicationState === undefined
        ? createDefaultState()
        : parseState(stored.applicationState);
    const candidate = Object.fromEntries(
      keys
        .filter((key) => Object.hasOwn(state.candidate, key))
        .map((key) => [key, state.candidate[key]]),
    );
    const result = await send({
      type: "FILL_PERSONAL_FIELDS",
      candidate,
      minimum: state.settings.confidence.automaticMinimum,
      preserveExisting: state.settings.preserveExisting,
    });
    if (
      typeof result !== "object" ||
      result === null ||
      !("report" in result) ||
      !isFillReport(result.report)
    )
      return {
        ok: false,
        error:
          "Não foi possível confirmar o preenchimento. Revise a página e tente desfazer se necessário.",
      };
    return { ok: true, report: result.report };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Dados inválidos"))
      return {
        ok: false,
        error:
          "Seus dados precisam de revisão. Abra as configurações antes de preencher.",
      };
    return {
      ok: false,
      error:
        "Não foi possível acessar a página. Clique no ícone da extensão nessa aba e tente novamente.",
    };
  }
}
export async function analyzeActiveTab(): Promise<AnalysisResponse> {
  return (await actOnActiveTab("ANALYZE_ACTIVE_TAB")) as AnalysisResponse;
}
