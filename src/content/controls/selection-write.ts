import type { SelectionField } from "./selection-fields";
import { selectionOptions, controlledList } from "./selection-fields";
import { isVisible } from "./visibility";
import { findOption } from "../../core/matching/options";
import type { AppState } from "../../shared/types";
import type { UndoEntry } from "../undo/history";
function editable(field: SelectionField) {
  return field.members.every(
    (e) =>
      e.isConnected &&
      isVisible(e) &&
      !e.matches(":disabled") &&
      !e.closest('[inert],[aria-disabled="true"],[aria-readonly="true"]'),
  );
}
function safeClick(element: HTMLElement) {
  if (
    !isVisible(element) ||
    element.matches(":disabled") ||
    element.closest("a[href]") ||
    element.getAttribute("aria-disabled") === "true"
  )
    throw Error("Controle indisponível.");
  if (
    element instanceof HTMLButtonElement &&
    element.form &&
    element.type !== "button"
  )
    throw Error("Botão com ação de envio não pode ser acionado.");
  if (
    element instanceof HTMLInputElement &&
    !["radio", "checkbox", "text"].includes(element.type)
  )
    throw Error("Ação não permitida.");
  element.click();
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
function checked(element: HTMLElement) {
  return element instanceof HTMLInputElement &&
    ["radio", "checkbox"].includes(element.type)
    ? element.checked
    : element.getAttribute("aria-checked") === "true";
}
function display(field: SelectionField) {
  return field.root instanceof HTMLInputElement
    ? field.root.value
    : (field.root.getAttribute("aria-valuetext") ??
        field.root.textContent?.trim() ??
        "");
}
function snapshot(field: SelectionField): string {
  if (field.root instanceof HTMLSelectElement)
    return JSON.stringify(
      [...field.root.options].map((option) => option.selected),
    );
  if (field.kind === "combobox") return JSON.stringify([display(field)]);
  return JSON.stringify(field.members.map(checked));
}
function placeholder(text: string) {
  return (
    !text.trim() ||
    /^(selecione|selecionar|select|choose|escolha|nenhum|none)(\b|$)/i.test(
      text.trim(),
    )
  );
}
function existing(field: SelectionField) {
  if (field.root instanceof HTMLSelectElement)
    return [...field.root.selectedOptions].some(
      (option) => option.value !== "" && !placeholder(option.label),
    );
  if (field.kind === "combobox") return !placeholder(display(field));
  return field.members.some(checked);
}
async function open(field: SelectionField) {
  if (field.root.getAttribute("aria-expanded") !== "true")
    safeClick(field.root);
  for (let attempt = 0; attempt < 6; attempt++) {
    const list = controlledList(field);
    if (list && isVisible(list) && list.querySelector("[role=option]"))
      return list;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw Error("Lista ARIA não carregou ou não possui vínculo único.");
}
function close(field: SelectionField) {
  field.root.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      code: "Escape",
      bubbles: true,
    }),
  );
}
function optionNode(list: HTMLElement, id: string) {
  return [...list.querySelectorAll<HTMLElement>("[role=option]")].find(
    (option, index) => (option.id || "option-" + index) === id,
  );
}
function changeChecked(element: HTMLInputElement, value: boolean) {
  Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "checked",
  )!.set!.call(element, value);
  element.dispatchEvent(new Event("click", { bubbles: true }));
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}
export async function writeSelection(
  field: SelectionField,
  values: string[],
  synonyms: AppState["synonyms"],
  preserveExisting: boolean,
): Promise<{
  status: "filled" | "preserved" | "review" | "failed";
  reason: string;
  entry?: UndoEntry;
}> {
  if (!editable(field))
    return { status: "review", reason: "Seleção indisponível ou oculta." };
  if (preserveExisting && existing(field))
    return { status: "preserved", reason: "Seleção existente preservada." };
  if (
    field.members.some(
      (member) =>
        (member instanceof HTMLInputElement && member.indeterminate) ||
        member.getAttribute("aria-checked") === "mixed",
    )
  )
    return { status: "review", reason: "Estado parcial exige revisão manual." };
  const before = snapshot(field),
    oldSelected = field.members.find(checked);
  let restore: (() => Promise<void>) | undefined;
  const entry = () => {
    const applied = snapshot(field);
    return {
      restore: async () => {
        if (!editable(field) || snapshot(field) !== applied)
          return "conflict" as const;
        try {
          await restore!();
          await tick();
          return snapshot(field) === before
            ? ("restored" as const)
            : ("failed" as const);
        } catch {
          return "failed" as const;
        }
      },
    };
  };
  try {
    if (field.kind === "combobox") {
      const oldText = display(field),
        list = await open(field);
      if (list.getAttribute("aria-multiselectable") === "true") {
        close(field);
        return {
          status: "review",
          reason:
            "Combobox ARIA múltiplo exige adaptação específica e revisão manual.",
        };
      }
      if (snapshot(field) !== before) {
        close(field);
        return {
          status: "review",
          reason: "Componente alterado ao abrir. Revise manualmente.",
        };
      }
      const options = selectionOptions(field),
        ids = findOption(values, options, synonyms);
      const oldOptions = options.filter((option) =>
        placeholder(oldText)
          ? placeholder(option.label) || option.value === ""
          : option.label === oldText || option.value === oldText,
      );
      if (ids?.length !== 1 || oldOptions.length !== 1) {
        close(field);
        return {
          status: "review",
          reason:
            "Seleção ARIA ambígua ou sem opção anterior restaurável. Revise manualmente.",
        };
      }
      const target = options.find((option) => option.id === ids[0])!,
        previous = oldOptions[0]!;
      restore = async () => {
        const owned = await open(field);
        const match = selectionOptions(field).filter(
          (option) =>
            option.label === previous.label && option.value === previous.value,
        );
        if (match.length !== 1) throw Error();
        const node = optionNode(owned, match[0]!.id);
        if (!node) throw Error();
        safeClick(node);
        await tick();
        close(field);
      };
      const node = optionNode(list, ids[0]!);
      if (!node) throw Error();
      safeClick(node);
      await tick();
      const committed =
        node.getAttribute("aria-selected") === "true" ||
        (field.root.getAttribute("aria-expanded") === "false" &&
          (display(field) === target.label || display(field) === target.value));
      if (!committed) {
        close(field);
        return {
          status: "failed",
          reason: "O componente não confirmou a seleção.",
          ...(snapshot(field) !== before ? { entry: entry() } : {}),
        };
      }
      close(field);
    } else {
      const options = selectionOptions(field),
        ids = findOption(values, options, synonyms);
      if (
        !ids ||
        !ids.length ||
        (!["select-multiple", "checkbox-group"].includes(field.kind) &&
          ids.length !== 1)
      )
        return {
          status: "review",
          reason: "Opções ausentes ou ambíguas. Nenhuma seleção aplicada.",
        };
      if (field.kind === "aria-radio" && !oldSelected)
        return {
          status: "review",
          reason:
            "Grupo ARIA vazio sem restauração segura. Revise manualmente.",
        };
      if (field.root instanceof HTMLSelectElement) {
        const select = field.root,
          old = [...select.options].map((option) => option.selected);
        restore = async () => {
          if (select.options.length !== old.length) throw Error();
          [...select.options].forEach(
            (option, index) => (option.selected = old[index]!),
          );
          select.dispatchEvent(new Event("input", { bubbles: true }));
          select.dispatchEvent(new Event("change", { bubbles: true }));
        };
        [...select.options].forEach(
          (option, index) => (option.selected = ids.includes(String(index))),
        );
        select.dispatchEvent(new Event("input", { bubbles: true }));
        select.dispatchEvent(new Event("change", { bubbles: true }));
        await tick();
        if (
          [...select.options].some(
            (option, index) => option.selected !== ids.includes(String(index)),
          )
        )
          throw Error("Seleção não mantida pelo site.");
      } else {
        const previous = field.members.map(checked);
        restore = async () => {
          if (field.kind === "aria-radio") {
            safeClick(oldSelected!);
          } else
            for (let index = 0; index < field.members.length; index++) {
              const member = field.members[index]!;
              if (
                member instanceof HTMLInputElement &&
                ["radio", "checkbox"].includes(member.type)
              )
                changeChecked(member, previous[index]!);
              else if (checked(member) !== previous[index]) safeClick(member);
            }
          await tick();
        };
        const wanted = field.members.map((_, index) =>
          ["checkbox", "aria-checkbox"].includes(field.kind)
            ? ids[0] === "true"
            : ids.includes(String(index)),
        );
        for (let index = 0; index < field.members.length; index++) {
          const member = field.members[index]!;
          if (checked(member) === wanted[index]) continue;
          if (field.kind === "radio" || field.kind === "aria-radio") {
            if (wanted[index]) safeClick(member);
          } else safeClick(member);
        }
        await tick();
        if (
          field.members.some(
            (member, index) => checked(member) !== wanted[index],
          )
        )
          throw Error("O site não manteve a seleção.");
      }
    }
    return snapshot(field) === before
      ? { status: "preserved", reason: "Seleção já corresponde à resposta." }
      : {
          status: "filled",
          reason:
            "Seleção aplicada. Recurso experimental; revise antes de enviar.",
          entry: entry(),
        };
  } catch (error) {
    close(field);
    return {
      status: "failed",
      reason: error instanceof Error ? error.message : "Falha na seleção.",
      ...(restore && snapshot(field) !== before ? { entry: entry() } : {}),
    };
  }
}
