import { isPageAnalysis, type AnalysisResponse } from "../shared/messaging";
export async function analyzeActiveTab(): Promise<AnalysisResponse> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url)
    return {
      ok: false,
      error: "Abra uma página de candidatura e tente novamente.",
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
  ) {
    return {
      ok: false,
      error:
        "Esta página é protegida pelo navegador. Abra um site de candidatura.",
    };
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, frameIds: [0] },
      files: ["content.js"],
    });
    const result: unknown = await chrome.tabs.sendMessage(
      tab.id,
      { type: "INSPECT_PAGE" },
      { frameId: 0 },
    );
    if (!isPageAnalysis(result))
      return {
        ok: false,
        error: "A página retornou uma análise inválida. Tente novamente.",
      };
    return { ok: true, analysis: result };
  } catch {
    return {
      ok: false,
      error:
        "Não foi possível acessar a página. Clique no ícone da extensão nessa aba para autorizar e tente novamente.",
    };
  }
}
