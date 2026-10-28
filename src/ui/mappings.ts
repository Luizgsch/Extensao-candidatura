import type { AppState } from "../shared/types";
const escape = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function renderMappings(state: AppState): string {
  if (!state.mappings.length)
    return '<div class="empty"><h2>Nenhum campo ensinado ainda</h2><p>Abra uma candidatura, clique em Ensinar um campo no popup e associe o campo a uma resposta salva.</p><p>Aprendizado experimental. A validação completa será feita na parte 13.</p></div>';
  return (
    "<p>Associações por site e identificação do campo. Desativar uma associação não desativa as demais regras.</p>" +
    state.mappings
      .map((mapping) => {
        const rule = state.rules.find((rule) => rule.id === mapping.ruleId);
        return (
          '<article class="entry"><header><div><h2>' +
          escape(
            mapping.fingerprint.label ||
              mapping.fingerprint.name ||
              mapping.fingerprint.id ||
              "Campo",
          ) +
          "</h2><small>" +
          escape(mapping.domain + (mapping.pathPattern ?? " · todo o site")) +
          " · " +
          escape(mapping.fingerprint.controlType) +
          '</small></div><div class="inline"><button class="secondary" data-map-edit="' +
          mapping.id +
          '">Editar associação</button><button class="secondary" data-map-toggle="' +
          mapping.id +
          '">' +
          (mapping.enabled ? "Desativar" : "Ativar") +
          '</button><button class="secondary" data-map-delete="' +
          mapping.id +
          '">Excluir associação</button></div></header><p>Resposta: ' +
          escape(rule?.name ?? "Não disponível") +
          " · " +
          (mapping.enabled ? "Ativa" : "Desativada") +
          "</p></article>"
        );
      })
      .join("") +
    '<div id="mapping-editor"></div>'
  );
}
interface Callbacks {
  save: (state: AppState) => Promise<void>;
  notify: (message: string) => void;
  confirmDiscard: () => boolean;
  restoreFocus: () => void;
}
export function bindMappings(state: AppState, callbacks: Callbacks) {
  const update = (id: string, kind: "toggle" | "delete") => {
    if (!callbacks.confirmDiscard()) return;
    if (
      kind === "delete" &&
      !confirm("Excluir esta associação? A resposta salva será mantida.")
    )
      return;
    const next = structuredClone(state);
    if (kind === "delete")
      next.mappings = next.mappings.filter((mapping) => mapping.id !== id);
    else {
      const mapping = next.mappings.find((mapping) => mapping.id === id);
      if (mapping) mapping.enabled = !mapping.enabled;
    }
    void callbacks.save(next);
  };
  document
    .querySelectorAll<HTMLButtonElement>("[data-map-toggle]")
    .forEach(
      (button) =>
        (button.onclick = () => update(button.dataset.mapToggle!, "toggle")),
    );
  document
    .querySelectorAll<HTMLButtonElement>("[data-map-delete]")
    .forEach(
      (button) =>
        (button.onclick = () => update(button.dataset.mapDelete!, "delete")),
    );
  document.querySelectorAll<HTMLButtonElement>("[data-map-edit]").forEach(
    (button) =>
      (button.onclick = () => {
        if (!callbacks.confirmDiscard()) return;
        const mapping = state.mappings.find(
          (mapping) => mapping.id === button.dataset.mapEdit,
        );
        if (!mapping) return;
        const editor = document.getElementById("mapping-editor")!;
        editor.innerHTML =
          '<form class="section"><h2>Editar associação</h2><p>' +
          escape(mapping.domain) +
          '</p><div class="grid"><div class="wide"><label for="mapped-rule">Resposta associada</label><select id="mapped-rule" name="ruleId">' +
          state.rules
            .map(
              (rule) =>
                '<option value="' +
                rule.id +
                '" ' +
                (rule.id === mapping.ruleId ? "selected" : "") +
                ">" +
                escape(rule.name) +
                (rule.enabled ? "" : " (desativada)") +
                "</option>",
            )
            .join("") +
          '</select></div><div class="wide"><label for="mapped-path">Caminho da página (vazio: todo o site)</label><input id="mapped-path" name="path" value="' +
          escape(mapping.pathPattern ?? "") +
          '" placeholder="/candidatura" maxlength="2000"></div><div class="wide check"><input id="mapped-consent" name="consent" type="checkbox" ' +
          (mapping.allowConsent ? "checked" : "") +
          '><label for="mapped-consent">Autorizar esta associação para responder aceites e declarações</label></div></div><div class="actions"><button>Salvar associação</button><button type="button" class="secondary" id="mapping-cancel">Cancelar</button></div></form>';
        const form = editor.querySelector("form")!;
        form.oninput = () => (form.dataset.dirty = "true");
        document.getElementById("mapping-cancel")!.onclick = () => {
          if (!callbacks.confirmDiscard()) return;
          editor.replaceChildren();
          callbacks.restoreFocus();
        };
        form.onsubmit = (event) => {
          event.preventDefault();
          const data = new FormData(form),
            path = String(data.get("path") ?? "").trim(),
            ruleId = String(data.get("ruleId") ?? "");
          if (path && (!path.startsWith("/") || /[?#]/.test(path))) {
            callbacks.notify(
              "Use um caminho começando com /, sem parâmetros ou fragmentos.",
            );
            return;
          }
          if (!state.rules.some((rule) => rule.id === ruleId)) {
            callbacks.notify("Escolha uma resposta existente.");
            return;
          }
          const next = structuredClone(state),
            current = next.mappings.find((item) => item.id === mapping.id)!;
          current.ruleId = ruleId;
          current.allowConsent = data.has("consent");
          if (path) current.pathPattern = path;
          else delete current.pathPattern;
          void callbacks.save(next);
        };
        form.querySelector<HTMLSelectElement>("select")?.focus();
      }),
  );
}
