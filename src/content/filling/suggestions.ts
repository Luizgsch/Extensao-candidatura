import type { RuleField, RuleResolution } from "../../core/matching/rules";
import {
  describeRuleField,
  elementForRule,
  foreignContext,
  signals,
} from "../context/fields";
import { isBlockedSignals } from "../../core/matching/personal-fields";
import { canWrite, type NativeTextControl } from "../controls/native";
import { writeValue } from "./write";
import { remember } from "../undo/history";
interface Suggestion {
  field: RuleField;
  element: NativeTextControl;
  before: string;
  resolution: RuleResolution;
}
const suggestions = new Map<string, Suggestion>();
export function clearSuggestions() {
  suggestions.clear();
}
export function propose(
  field: RuleField,
  resolution: RuleResolution,
): string | undefined {
  const element = elementForRule(field.fieldId);
  if (!element || resolution.value === undefined) return undefined;
  const id = crypto.randomUUID();
  suggestions.set(id, { field, element, before: element.value, resolution });
  return id;
}
export function suggestionPlan(
  id: string,
): { field: RuleField; ruleId: string } | undefined {
  const suggestion = suggestions.get(id);
  if (
    !suggestion?.resolution.ruleId ||
    !canWrite(suggestion.element) ||
    suggestion.element.value !== suggestion.before ||
    foreignContext(suggestion.element) ||
    isBlockedSignals(signals(suggestion.element)) ||
    describeRuleField(suggestion.element).fingerprint !==
      suggestion.field.fingerprint
  )
    return undefined;
  return { field: suggestion.field, ruleId: suggestion.resolution.ruleId };
}
export async function applySuggestion(id: string, current: RuleResolution) {
  const suggestion = suggestions.get(id),
    plan = suggestionPlan(id);
  if (
    !suggestion ||
    !plan ||
    current.ruleId !== plan.ruleId ||
    current.decision === "skip" ||
    current.value === undefined ||
    current.value !== suggestion.resolution.value
  )
    return {
      ok: false as const,
      error:
        "Campo ou regra alterado. Preencha novamente para revisar a sugestão atual.",
    };
  const result = await writeValue(suggestion.element, current.value, false);
  if (result.entry) remember([result.entry]);
  suggestions.delete(id);
  return { ok: true as const, result, fieldId: plan.field.fieldId };
}
