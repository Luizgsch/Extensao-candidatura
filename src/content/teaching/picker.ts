import { isVisible } from "../controls/visibility";
import { isSimpleControl, highlight } from "../controls/native";
import { foreignContext, signals } from "../context/fields";
import { isBlockedSignals } from "../../core/matching/personal-fields";
import { selectionFields } from "../controls/selection-fields";
import { learnedFingerprint } from "../context/learned-target";
import type { FieldMapping } from "../../shared/types";
interface TeachingRule {
  id: string;
  name: string;
  type: string;
}
let stopCurrent: (() => void) | undefined;
export function startTeaching(sessionId: string, rules: TeachingRule[]) {
  stopCurrent?.();
  const controller = new AbortController(),
    host = document.createElement("div");
  host.style.cssText =
    "all:initial;position:fixed;right:16px;bottom:16px;z-index:2147483647;max-width:calc(100vw - 32px);";
  const shadow = host.attachShadow({ mode: "closed" }),
    sheet = new CSSStyleSheet();
  sheet.replaceSync(
    ":host{color-scheme:light}.panel{box-sizing:border-box;width:350px;max-width:calc(100vw - 32px);padding:22px;background:#f5efe6;color:#2a211c;border:1px solid #b7a391;border-radius:6px;font:14px/1.5 system-ui,sans-serif;box-shadow:0 8px 28px #39281f33}h2{font:26px Georgia,serif;margin:0 0 12px}p{overflow-wrap:anywhere}label{display:block;margin:14px 0 6px}select,button{box-sizing:border-box;width:100%;min-height:44px;padding:10px;font:inherit;border:1px solid #b7a391;border-radius:4px}select{background:#fffcf8;color:#2a211c}button{margin-top:12px;background:#714a35;color:white;cursor:pointer}button:disabled{opacity:.55;cursor:not-allowed}.secondary{background:transparent;color:#39281f}input{accent-color:#714a35}.check{display:flex;gap:10px;align-items:flex-start}.check input{width:20px;height:20px;flex-shrink:0}:focus-visible{outline:3px solid #a26931;outline-offset:3px}",
  );
  shadow.adoptedStyleSheets = [sheet];
  const panel = document.createElement("section");
  panel.className = "panel";
  panel.setAttribute("role", "region");
  panel.setAttribute("aria-label", "Ensinar este campo");
  const title = document.createElement("h2");
  title.textContent = "Ensinar este campo";
  const status = document.createElement("p");
  status.setAttribute("role", "status");
  status.textContent =
    "Clique no campo da página que deseja ensinar. Esc cancela.";
  const label = document.createElement("label");
  label.textContent = "Esta pergunta corresponde a";
  const select = document.createElement("select");
  select.setAttribute("aria-label", "Resposta associada");
  select.append(
    new Option("Selecione uma resposta", ""),
    ...rules.map((rule) => new Option(rule.name + " · " + rule.type, rule.id)),
  );
  label.append(select);
  function check(text: string, checked = false) {
    const wrapper = document.createElement("label");
    wrapper.className = "check";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = checked;
    const span = document.createElement("span");
    span.textContent = text;
    wrapper.append(input, span);
    return { wrapper, input };
  }
  const path = check("Limitar a esta página do site", true),
    consent = check(
      "Autorizar este mapeamento para responder aceites e declarações",
    );
  consent.wrapper.hidden = true;
  const save = document.createElement("button");
  save.type = "button";
  save.textContent = "Salvar associação";
  save.disabled = true;
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "secondary";
  cancel.textContent = "Cancelar";
  panel.append(
    title,
    status,
    label,
    path.wrapper,
    consent.wrapper,
    save,
    cancel,
  );
  shadow.append(panel);
  document.documentElement.append(host);
  let target: FieldMapping["fingerprint"] | undefined,
    saving = false;
  const update = () => {
    save.disabled = saving || !target || !select.value;
    cancel.disabled = saving;
  };
  select.addEventListener("change", update);
  function cleanup(notify = true) {
    controller.abort();
    clearTimeout(timeout);
    host.remove();
    stopCurrent = undefined;
    if (notify)
      void chrome.runtime
        .sendMessage({ type: "CANCEL_TEACHING", sessionId })
        .catch(() => {});
  }
  stopCurrent = () => cleanup();
  const timeout = setTimeout(() => cleanup(), 10 * 60 * 1000);
  cancel.onclick = () => cleanup();
  const inside = (event: Event) => event.composedPath().includes(host);
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (!inside(event)) {
        if (!host.isConnected) {
          cleanup();
          return;
        }
        event.preventDefault();
      }
    },
    { capture: true, signal: controller.signal },
  );
  document.addEventListener(
    "click",
    (event) => {
      if (inside(event)) return;
      if (!host.isConnected) {
        cleanup();
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!event.isTrusted || saving) return;
      let element =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>(
              "input,textarea,select,[role=combobox],[role=radio],[role=checkbox]",
            )
          : null;
      if (!element && event.target instanceof Element) {
        const control = event.target.closest("label")?.control;
        if (control instanceof HTMLElement) element = control;
      }
      if (!element || !isVisible(element) || foreignContext(element)) {
        status.textContent =
          "Escolha um campo visível do formulário, fora de seções de terceiros.";
        return;
      }
      const selection = selectionFields().find(
        (field) => field.root === element || field.members.includes(element!),
      );
      if (selection)
        target = learnedFingerprint(
          selection.root,
          selection.kind,
          ["radio", "checkbox-group", "aria-radio"].includes(selection.kind)
            ? selection.question
            : undefined,
        );
      else if (isSimpleControl(element) && !isBlockedSignals(signals(element)))
        target = learnedFingerprint(
          element,
          element instanceof HTMLTextAreaElement ? "textarea" : element.type,
        );
      else {
        status.textContent =
          "Campo protegido ou componente não suportado. Selecione outro campo.";
        return;
      }
      if (!target.label && !target.id && !target.name) {
        target = undefined;
        status.textContent =
          "Este campo não tem identificação suficiente para aprender com segurança.";
        update();
        return;
      }
      consent.wrapper.hidden =
        !/termo|privacidade|consent|policy|politica|marketing|newsletter|declar|autoriza.*dados/i.test(
          target.label ?? "",
        );
      consent.input.checked = false;
      status.textContent =
        "Campo selecionado: " + (target.label || target.name || target.id);
      highlight(element, "review");
      update();
      select.focus();
    },
    { capture: true, signal: controller.signal },
  );
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape" && saving) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        cleanup();
      } else if (!inside(event) && ["Enter", " "].includes(event.key)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    { capture: true, signal: controller.signal },
  );
  window.addEventListener("pagehide", () => cleanup(), {
    once: true,
    signal: controller.signal,
  });
  save.onclick = async () => {
    if (!target || !select.value || saving) return;
    saving = true;
    status.textContent = "Salvando associação…";
    update();
    try {
      const response = await chrome.runtime.sendMessage({
        type: "SAVE_TAUGHT_FIELD",
        sessionId,
        ruleId: select.value,
        onlyPath: path.input.checked,
        allowConsent: consent.input.checked,
        fingerprint: target,
      });
      if (response?.ok === true) {
        status.textContent =
          "Associação salva. Clique em Preencher para usá-la. Nenhum valor foi alterado.";
        controller.abort();
        select.disabled = true;
        save.hidden = true;
        cancel.textContent = "Concluir";
      } else
        status.textContent =
          response?.error ??
          "Não foi possível salvar. Reabra o modo de ensino.";
    } catch {
      status.textContent = "Falha ao salvar. Reabra o modo de ensino.";
    } finally {
      saving = false;
      update();
    }
  };
  return { ok: true, teaching: true };
}
