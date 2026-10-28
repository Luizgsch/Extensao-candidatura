import {
  resolveRule,
  type RuleField,
  type RuleScope,
  type RuleResolution,
} from "./rules";
import { matchPersonalField } from "./personal-fields";
import { selectionPersonalKey, selectionValues } from "./options";
import type { AppState } from "../../shared/types";
export const selectionTypes = new Set([
  "select-one",
  "select-multiple",
  "radio",
  "checkbox",
  "checkbox-group",
  "combobox",
  "aria-checkbox",
  "aria-radio",
]);
export function resolveSelection(
  field: RuleField,
  state: AppState,
  scope: RuleScope,
): RuleResolution {
  const key =
    matchPersonalField({
      label: field.question,
      name: "",
      id: "",
      placeholder: "",
      autocomplete: "",
    }).key ?? selectionPersonalKey(field.question);
  if (key && state.candidate[key]) {
    const values = selectionValues(state.candidate[key]!, field.language, key),
      score = 95;
    return {
      fieldId: field.fieldId,
      fingerprint: field.fingerprint,
      score,
      decision:
        values && score >= state.settings.confidence.automaticMinimum
          ? "fill"
          : "skip",
      reason: values
        ? "Dado pessoal configurado."
        : "Tipo de dado incompatível com seleção.",
      ...(values ? { value: values.join(", "), selectionValues: values } : {}),
    };
  }
  return resolveRule(field, state, scope);
}
