import { normalizeText } from "../../core/normalization";
import {
  matchPersonalField,
  isBlockedSignals,
  type PersonalSignals,
} from "../../core/matching/personal-fields";
import type { Language } from "../../shared/types";
import type { RuleField } from "../../core/matching/rules";
import { isSimpleControl, type NativeTextControl } from "../controls/native";
import { visibleNativeControls } from "../detector/inventory";
const ids = new WeakMap<Element, string>();
const elements = new Map<string, NativeTextControl>();
let serial = 0;
export function signals(element: NativeTextControl): PersonalSignals {
  const aria = element
    .getAttribute("aria-labelledby")
    ?.split(/\s+/)
    .map((id) => document.getElementById(id)?.textContent ?? "")
    .join(" ");
  let label = (
    aria ||
    element.getAttribute("aria-label") ||
    [...(element.labels ?? [])]
      .map((label) => label.textContent ?? "")
      .join(" ")
  ).trim();
  if (
    !label &&
    element.parentElement?.querySelectorAll("input,textarea,select").length ===
      1
  ) {
    const clone = element.parentElement.cloneNode(true) as HTMLElement;
    clone
      .querySelectorAll("input,textarea,select,button,output,script,style")
      .forEach((node) => node.remove());
    label = clone.textContent?.trim() ?? "";
  }
  return {
    label: label.slice(0, 2000),
    autocomplete: element.autocomplete,
    name: element.name,
    id: element.id,
    placeholder: element.placeholder,
  };
}
export function foreignContext(element: Element): boolean {
  const fieldset = element.closest("fieldset"),
    section = element.closest('section,[role="group"]');
  const heading = [
    fieldset?.querySelector("legend")?.textContent,
    section?.getAttribute("aria-label"),
    section?.querySelector("h1,h2,h3,h4")?.textContent,
  ]
    .filter(Boolean)
    .join(" ");
  return /referenc|reference|emergency contact|contato de emergencia|dados da empresa|company details|experiencia profissional|work experience|employment history|formacao academica|education history|dados da mae|dados do pai|filiacao|parent details/.test(
    normalizeText(heading),
  );
}
export function languageOf(element: Element): Language {
  return (
    element.closest("[lang]")?.getAttribute("lang") ??
    document.documentElement.lang
  )
    .toLowerCase()
    .startsWith("en")
    ? "en"
    : "pt-BR";
}
export function describeRuleField(element: NativeTextControl): RuleField {
  let fieldId = ids.get(element);
  if (!fieldId) {
    fieldId = "rule-field-" + ++serial;
    ids.set(element, fieldId);
  }
  elements.set(fieldId, element);
  const s = signals(element),
    question =
      s.label ||
      s.placeholder ||
      s.name.replace(/([a-z])([A-Z])/g, "$1 $2") ||
      s.id;
  const controlType =
      element instanceof HTMLTextAreaElement ? "textarea" : element.type,
    language = languageOf(element);
  return {
    fieldId,
    question,
    controlType,
    language,
    fingerprint: JSON.stringify([
      s,
      controlType,
      language,
      foreignContext(element),
    ]),
  };
}
export function elementForRule(fieldId: string): NativeTextControl | undefined {
  return elements.get(fieldId);
}
export function planRuleFields(): RuleField[] {
  elements.clear();
  return visibleNativeControls(document)
    .filter(isSimpleControl)
    .filter((element) => {
      if (foreignContext(element) || isBlockedSignals(signals(element)))
        return false;
      if (element instanceof HTMLInputElement) {
        const match = matchPersonalField(signals(element));
        if (match.ambiguous) return false;
      }
      return true;
    })
    .map(describeRuleField)
    .filter((field) => field.question.length > 0);
}
