import { isPageAnalysis } from "../shared/messaging";
import { loadState, preview } from "./storage";
const status = document.querySelector<HTMLElement>("#status")!;
const select = document.querySelector<HTMLSelectElement>("#profile")!;
void loadState()
  .then(async (state) => {
    if (state.profiles.length) {
      select.replaceChildren(
        ...state.profiles.map(
          (profile) => new Option(profile.name, profile.id),
        ),
      );
    }
    if (!preview) {
      const saved = await chrome.storage.local.get("selectedProfileId");
      if (state.profiles.some((p) => p.id === saved.selectedProfileId))
        select.value = String(saved.selectedProfileId);
    }
  })
  .catch(() => {
    status.textContent =
      "Não foi possível carregar os perfis. Reabra a extensão.";
  });
select.addEventListener("change", () => {
  if (!preview)
    void chrome.storage.local
      .set({ selectedProfileId: select.value })
      .catch(() => {
        status.textContent = "Não foi possível salvar o perfil.";
      });
});
document.querySelector("#settings")!.addEventListener("click", () => {
  if (preview) window.location.href = "settings.html";
  else
    void chrome.runtime.openOptionsPage().catch(() => {
      status.textContent = "Não foi possível abrir as configurações.";
    });
});

const analyze = document.querySelector<HTMLButtonElement>("#analyze")!;
const found = document.querySelector<HTMLElement>("#found")!;
const editable = document.querySelector<HTMLElement>("#editable")!;
const note = document.querySelector<HTMLElement>("#analysis-note")!;
if (preview) {
  analyze.disabled = true;
  note.textContent = "Análise disponível somente pela extensão instalada.";
}
analyze.addEventListener("click", async () => {
  analyze.disabled = true;
  analyze.textContent = "Analisando…";
  found.textContent = "—";
  editable.textContent = "—";
  note.textContent = "";
  status.textContent = "Lendo os campos visíveis da aba atual…";
  try {
    const response: unknown = await chrome.runtime.sendMessage({
      type: "ANALYZE_ACTIVE_TAB",
    });
    if (
      typeof response !== "object" ||
      response === null ||
      !("ok" in response)
    )
      throw new Error(
        "Resposta inválida. Reabra a extensão e tente novamente.",
      );
    if (response.ok !== true) {
      status.textContent =
        "error" in response && typeof response.error === "string"
          ? response.error
          : "Não foi possível analisar. Tente novamente.";
      return;
    }
    if (!("analysis" in response) || !isPageAnalysis(response.analysis))
      throw new Error("Análise inválida. Tente novamente.");
    const result = response.analysis;
    found.textContent = String(result.fieldsFound);
    editable.textContent = String(result.editableFields);
    status.textContent = result.fieldsFound
      ? "Análise concluída. Nenhum campo foi alterado."
      : "Nenhum campo nativo visível encontrado nesta página.";
    note.textContent =
      "Análise básica da página principal. Componentes customizados ainda não são identificados." +
      (result.embeddedFrames
        ? " Há formulários ou conteúdos em frames; os campos internos não foram analisados."
        : "") +
      (result.manualUploads
        ? " Há campos de anexo; selecione os arquivos manualmente."
        : "");
  } catch (error) {
    status.textContent =
      error instanceof Error
        ? error.message
        : "Falha de comunicação. Reabra a extensão.";
  } finally {
    analyze.disabled = false;
    analyze.textContent = "Analisar página";
  }
});
