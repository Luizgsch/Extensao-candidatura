import { learnedFingerprint } from "../context/learned-target";
import { isVisible } from "./visibility";
import { signals, foreignContext, languageOf } from "../context/fields";
import {
  matchPersonalField,
  isBlockedSignals,
} from "../../core/matching/personal-fields";
import type { RuleField } from "../../core/matching/rules";
export interface SelectionField {
  id: string;
  root: HTMLElement;
  members: HTMLElement[];
  kind:
    | "select-one"
    | "select-multiple"
    | "radio"
    | "checkbox"
    | "checkbox-group"
    | "combobox"
    | "aria-checkbox"
    | "aria-radio";
  question: string;
}
const ids = new WeakMap<Element, string>();
let sequence = 0;
function idFor(element: Element) {
  let id = ids.get(element);
  if (!id) {
    id = "selection-" + ++sequence;
    ids.set(element, id);
  }
  return id;
}
export function isSelectionElement(element: Element): boolean {
  return (
    element instanceof HTMLSelectElement ||
    (element instanceof HTMLInputElement &&
      ["radio", "checkbox"].includes(element.type)) ||
    ["combobox", "radio", "checkbox"].includes(
      element.getAttribute("role") ?? "",
    )
  );
}
export function labelFor(element: HTMLElement): string {
  const aria = element
    .getAttribute("aria-labelledby")
    ?.split(/\s+/)
    .map((id) => document.getElementById(id)?.textContent ?? "")
    .join(" ");
  if (aria || element.getAttribute("aria-label"))
    return (aria || element.getAttribute("aria-label") || "").trim();
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement
  ) {
    const labels = [...(element.labels ?? [])]
      .map((label) => {
        const copy = label.cloneNode(true) as HTMLElement;
        copy
          .querySelectorAll("input,select,textarea,[role=option]")
          .forEach((e) => e.remove());
        return copy.textContent ?? "";
      })
      .join(" ")
      .trim();
    if (labels) return labels;
  }
  return element.textContent?.trim() ?? "";
}
function questionFor(
  root: HTMLElement,
  members: HTMLElement[],
  group: boolean,
): string {
  if (group) {
    const groupRoot = root.closest("fieldset,[role=radiogroup],[role=group]");
    const question =
      groupRoot?.querySelector("legend")?.textContent ||
      groupRoot?.getAttribute("aria-label") ||
      groupRoot
        ?.getAttribute("aria-labelledby")
        ?.split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent ?? "")
        .join(" ");
    if (question) return question.trim();
    return (root.getAttribute("name") ?? "").replace(
      /([a-z])([A-Z])/g,
      "$1 $2",
    );
  }
  return labelFor(root) || root.getAttribute("name") || root.id;
}
export function selectionFields(): SelectionField[] {
  const result: SelectionField[] = [];
  const seen = new Set<HTMLElement>();
  const nodes = [
    ...document.querySelectorAll<HTMLElement>(
      "select,input[type=radio],input[type=checkbox],[role=combobox],[role=radio],[role=checkbox]",
    ),
  ];
  for (const node of nodes) {
    if (seen.has(node) || !isVisible(node)) continue;
    let kind: SelectionField["kind"],
      members: HTMLElement[] = [node];
    if (node instanceof HTMLSelectElement)
      kind = node.multiple ? "select-multiple" : "select-one";
    else if (node.getAttribute("role") === "combobox") kind = "combobox";
    else if (
      node instanceof HTMLInputElement &&
      ["radio", "checkbox"].includes(node.type)
    ) {
      kind = node.type === "radio" ? "radio" : "checkbox";
      const group = node.closest("fieldset,[role=group],[role=radiogroup]");
      if (node.type === "radio" && node.name) {
        members = nodes.filter(
          (other) =>
            other instanceof HTMLInputElement &&
            other.type === "radio" &&
            other.name === node.name &&
            other.form === node.form &&
            isVisible(other),
        );
      } else if (node.type === "checkbox" && group) {
        const boxes = [
          ...group.querySelectorAll<HTMLInputElement>("input[type=checkbox]"),
        ].filter(
          (box) =>
            box.closest("fieldset,[role=group],[role=radiogroup]") === group &&
            isVisible(box),
        );
        if (boxes.length > 1) {
          kind = "checkbox-group";
          members = boxes;
        }
      }
    } else {
      kind =
        node.getAttribute("role") === "combobox"
          ? "combobox"
          : node.getAttribute("role") === "checkbox"
            ? "aria-checkbox"
            : "aria-radio";
      if (kind === "aria-radio") {
        const group = node.closest("[role=radiogroup]");
        if (group)
          members = [
            ...group.querySelectorAll<HTMLElement>("[role=radio]"),
          ].filter(isVisible);
      }
    }
    members.forEach((member) => seen.add(member));
    const question = questionFor(
      node,
      members,
      ["radio", "checkbox-group", "aria-radio"].includes(kind),
    );
    if (
      !question ||
      foreignContext(node) ||
      isBlockedSignals({
        label: question,
        autocomplete: node.getAttribute("autocomplete") ?? "",
        name: node.getAttribute("name") ?? "",
        id: node.id,
        placeholder: "",
      })
    )
      continue;
    result.push({
      id: idFor(node),
      root: node,
      members,
      kind,
      question: question.slice(0, 2000),
    });
  }
  return result;
}
export function controlledList(field: SelectionField): HTMLElement | undefined {
  const ids = (
    field.root.getAttribute("aria-controls") ||
    field.root.getAttribute("aria-owns") ||
    ""
  )
    .split(/\s+/)
    .filter(Boolean);
  if (ids.length !== 1) return undefined;
  const list = document.getElementById(ids[0]!);
  return list?.getAttribute("role") === "listbox" ? list : undefined;
}
export function selectionOptions(field: SelectionField) {
  if (field.root instanceof HTMLSelectElement)
    return [...field.root.options].map((option, index) => ({
      id: String(index),
      label: option.label,
      value: option.value,
      disabled:
        option.disabled ||
        (option.parentElement instanceof HTMLOptGroupElement &&
          option.parentElement.disabled),
    }));
  if (["checkbox", "aria-checkbox"].includes(field.kind))
    return [
      { id: "true", label: "Sim", value: "true", disabled: false },
      { id: "false", label: "Não", value: "false", disabled: false },
    ];
  if (field.kind === "combobox") {
    const list = controlledList(field);
    return list
      ? [...list.querySelectorAll<HTMLElement>("[role=option]")].map(
          (option, index) => ({
            id: option.id || "option-" + index,
            label: option.textContent?.trim() ?? "",
            value:
              option.getAttribute("data-value") ??
              option.textContent?.trim() ??
              "",
            disabled: option.getAttribute("aria-disabled") === "true",
          }),
        )
      : [];
  }
  return field.members.map((member, index) => ({
    id: String(index),
    label: labelFor(member),
    value:
      member instanceof HTMLInputElement
        ? member.value
        : (member.getAttribute("data-value") ?? labelFor(member)),
    disabled:
      member.matches(":disabled") ||
      member.getAttribute("aria-disabled") === "true",
  }));
}
export function selectionDescriptor(field: SelectionField): RuleField {
  return {
    fieldId: field.id,
    mappingFingerprint: learnedFingerprint(
      field.root,
      field.kind,
      ["radio", "checkbox-group", "aria-radio"].includes(field.kind)
        ? field.question
        : undefined,
    ),
    question: field.question,
    controlType: field.kind,
    language: languageOf(field.root),
    fingerprint: JSON.stringify([
      field.kind,
      field.question,
      field.root.id,
      field.root.getAttribute("name"),
      field.members.map((m) => m.id),
      field.kind === "combobox"
        ? field.root.getAttribute("aria-controls")
        : selectionOptions(field),
    ]),
    options: selectionOptions(field),
  };
}
export function personalSelectionKey(
  field: SelectionField,
): string | undefined {
  return matchPersonalField({
    label: field.question,
    autocomplete: "",
    name: "",
    id: "",
    placeholder: "",
  }).key;
}
