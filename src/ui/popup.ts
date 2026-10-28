import { isPageAnalysis } from "../shared/messaging";
import { isFillReport, type FillReport } from "../shared/filling";
import { loadState, preview } from "./storage";
const $ = (id: string) => document.getElementById(id)!;
const status = $("status"),
  note = $("analysis-note");
const select = $("profile") as HTMLSelectElement;
const actions = ["analyze", "fill", "undo"].map(
  (id) => $(id) as HTMLButtonElement,
);
let undoAvailable = false,
  busy = false;
let profiles: Awaited<ReturnType<typeof loadState>>["profiles"] = [];
function updateControls() {
  for (const button of actions)
    button.disabled =
      preview || busy || (button.id === "undo" && !undoAvailable);
  select.disabled = busy;
  document
    .querySelectorAll<HTMLButtonElement>("[data-suggestion]")
    .forEach((button) => (button.disabled = busy || preview));
}
function showResume() {
  const profile = profiles.find((p) => p.id === select.value);
  $("resume").textContent = profile?.preferredResumeName
    ? "Currículo recomendado: " + profile.preferredResumeName
    : "Dados gerais e respostas ativas do perfil selecionado.";
}
void loadState()
  .then(async (state) => {
    profiles = state.profiles;
    select.replaceChildren(
      new Option("Dados gerais", ""),
      ...profiles.map((profile) => new Option(profile.name, profile.id)),
    );
    if (!preview) {
      const saved = await chrome.storage.local.get("selectedProfileId");
      if (profiles.some((p) => p.id === saved.selectedProfileId))
        select.value = String(saved.selectedProfileId);
    }
    showResume();
  })
  .catch(() => {
    status.textContent =
      "Não foi possível carregar seus dados. Abra as configurações.";
  });
select.addEventListener("change", () => {
  showResume();
  if (!preview)
    void chrome.storage.local
      .set({ selectedProfileId: select.value })
      .catch(() => {
        status.textContent = "Não foi possível salvar o perfil.";
      });
});
$("settings").addEventListener("click", () => {
  if (preview) window.location.href = "settings.html";
  else
    void chrome.runtime.openOptionsPage().catch(() => {
      status.textContent = "Não foi possível abrir as configurações.";
    });
});
function clearCounts() {
  for (const id of [
    "found",
    "editable",
    "recognized",
    "filled",
    "review",
    "preserved",
    "unknown",
    "unsupported",
  ])
    $(id).textContent = "—";
  $("field-details").hidden = true;
  $("field-results").replaceChildren();
}
function showReport(report: FillReport) {
  for (const id of [
    "found",
    "recognized",
    "filled",
    "preserved",
    "unknown",
    "unsupported",
  ] as const)
    $(id).textContent = String(report[id]);
  $("review").textContent = String(report.review + report.failed);
  $("editable").textContent = String(report.editable);
  undoAvailable = report.undoAvailable;
  note.textContent =
    "Dados e respostas em inputs simples. Textos longos exigem clique; seleções e frames continuam manuais.";
  const labels = {
    filled: "Preenchido",
    preserved: "Preservado",
    review: "Revisão",
    unknown: "Desconhecido",
    unsupported: "Manual",
    failed: "Falha",
  };
  const items = report.items.map((item) => {
    const li = document.createElement("li");
    const title = document.createElement("strong");
    title.textContent = item.label;
    const description = document.createElement("span");
    description.textContent = labels[item.status] + ": " + item.reason;
    li.append(title, description);
    if (item.ruleName) {
      const meta = document.createElement("span");
      meta.textContent =
        "Regra: " + item.ruleName + " · " + String(item.score ?? 0) + "/100";
      li.append(meta);
    }
    if (item.suggestionId && item.suggestionPreview !== undefined) {
      const text = document.createElement("p");
      text.textContent = item.suggestionPreview;
      const button = document.createElement("button");
      button.className = "secondary";
      button.dataset.suggestion = item.suggestionId;
      button.textContent = "Inserir sugestão";
      button.setAttribute("aria-label", "Inserir sugestão: " + item.label);
      button.addEventListener(
        "click",
        () => void run("APPLY_SUGGESTION_ACTIVE_TAB", item.suggestionId),
      );
      li.append(text, button);
    }
    return li;
  });
  $("field-results").replaceChildren(...items);
  $("field-details").hidden = items.length === 0;
}
async function run(type: string, suggestionId?: string) {
  if (busy || preview) return;
  busy = true;
  updateControls();
  status.textContent =
    type === "FILL_ACTIVE_TAB"
      ? "Preenchendo campos conhecidos…"
      : type === "UNDO_ACTIVE_TAB"
        ? "Restaurando valores anteriores…"
        : type === "ANALYZE_ACTIVE_TAB"
          ? "Analisando a página…"
          : "";
  try {
    const value: unknown = await chrome.runtime.sendMessage({
      type,
      ...(suggestionId ? { suggestionId } : {}),
    });
    if (typeof value !== "object" || value === null || !("ok" in value))
      throw new Error("Resposta inválida. Reabra a extensão.");
    if (value.ok !== true)
      throw new Error(
        "error" in value && typeof value.error === "string"
          ? value.error
          : "Não foi possível acessar a página.",
      );
    if (
      type === "ANALYZE_ACTIVE_TAB" &&
      "analysis" in value &&
      isPageAnalysis(value.analysis)
    ) {
      clearCounts();
      $("found").textContent = String(value.analysis.fieldsFound);
      $("editable").textContent = String(value.analysis.editableFields);
      status.textContent = "Análise concluída. Nenhum campo foi alterado.";
      note.textContent =
        "Contagem de campos nativos da página principal." +
        (value.analysis.embeddedFrames
          ? " Campos em frames não analisados."
          : "") +
        (value.analysis.manualUploads ? " Anexos exigem seleção manual." : "");
    } else if (
      ["FILL_ACTIVE_TAB", "APPLY_SUGGESTION_ACTIVE_TAB"].includes(type) &&
      "report" in value &&
      isFillReport(value.report)
    ) {
      showReport(value.report);
      status.textContent =
        value.report.filled +
        " campo(s) preenchido(s). Revise a página antes de enviar.";
    } else if (
      type === "UNDO_ACTIVE_TAB" &&
      "undo" in value &&
      typeof value.undo === "object" &&
      value.undo !== null &&
      "restored" in value.undo &&
      "conflicts" in value.undo &&
      "failed" in value.undo
    ) {
      clearCounts();
      undoAvailable = false;
      status.textContent =
        String(value.undo.restored) +
        " campo(s) restaurado(s). " +
        String(value.undo.conflicts) +
        " alteração(ões) posterior(es) ou campos indisponíveis preservados. " +
        String(value.undo.failed) +
        " falha(s).";
    } else if (
      type === "GET_ACTIVE_SESSION" &&
      "session" in value &&
      typeof value.session === "object" &&
      value.session !== null &&
      "undoAvailable" in value.session
    ) {
      const session = value.session;
      undoAvailable = session.undoAvailable === true;
      if ("report" in session && isFillReport(session.report)) {
        showReport({ ...session.report, undoAvailable });
        status.textContent =
          "Último preenchimento nesta página. Revise os campos antes de enviar.";
      }
    } else throw new Error("Resultado inválido. Revise a página.");
  } catch (error) {
    status.textContent =
      error instanceof Error
        ? error.message
        : "Falha de comunicação. Reabra a extensão.";
  } finally {
    busy = false;
    updateControls();
  }
}
$("analyze").addEventListener("click", () => void run("ANALYZE_ACTIVE_TAB"));
$("fill").addEventListener("click", () => void run("FILL_ACTIVE_TAB"));
$("undo").addEventListener("click", () => void run("UNDO_ACTIVE_TAB"));
updateControls();
if (preview) {
  status.textContent =
    "Prévia visual: análise e preenchimento funcionam somente pela extensão instalada.";
} else void run("GET_ACTIVE_SESSION");
