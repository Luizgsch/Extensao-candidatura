import { isSelectionElement } from "../controls/selection-fields";
import type { AnswerValue } from "../../shared/types";
import {
  matchPersonalField,
  valueForPersonalField,
  isBlockedSignals,
} from "../../core/matching/personal-fields";
import type { RuleResolution } from "../../core/matching/rules";
import type { FillReport, FieldOutcome } from "../../shared/filling";
import { visibleNativeControls } from "../detector/inventory";
import {
  signals,
  foreignContext,
  languageOf,
  describeRuleField,
} from "../context/fields";
import {
  canWrite,
  isSimpleControl,
  highlight,
  type NativeTextControl,
} from "../controls/native";
import { remember, hasUndo, type UndoEntry } from "../undo/history";
import { writeValue } from "./write";
import { clearSuggestions, propose } from "./suggestions";
const supported = new Set(["text", "email", "tel", "url", "number", "date"]);
export function planPersonalFields(): string[] {
  return [
    ...new Set(
      visibleNativeControls(document)
        .filter(
          (e): e is HTMLInputElement =>
            e instanceof HTMLInputElement &&
            supported.has(e.type) &&
            isSimpleControl(e) &&
            !foreignContext(e),
        )
        .map((e) => matchPersonalField(signals(e)).key)
        .filter((key): key is string => !!key),
    ),
  ];
}
export async function fillPersonalFields(
  candidate: Record<string, AnswerValue>,
  minimum: number,
  preserveExisting: boolean,
  resolutions: RuleResolution[] = [],
): Promise<FillReport> {
  clearSuggestions();
  const report: FillReport = {
    found: 0,
    editable: 0,
    recognized: 0,
    filled: 0,
    preserved: 0,
    review: 0,
    unknown: 0,
    unsupported: 0,
    failed: 0,
    undoAvailable: hasUndo(),
    items: [],
  };
  const batch: UndoEntry[] = [];
  for (const element of visibleNativeControls(document)) {
    if (isSelectionElement(element)) continue;
    report.found++;
    if (
      !element.matches(":disabled") &&
      !("readOnly" in element && element.readOnly) &&
      element.type !== "file"
    )
      report.editable++;
    const native = isSimpleControl(element);
    const label = native
      ? signals(element as NativeTextControl).label ||
        element.name ||
        element.id
      : element.getAttribute("aria-label") ||
        element.name ||
        element.tagName.toLowerCase();
    const item: FieldOutcome = {
      label: label.slice(0, 180) || "Campo sem identificação",
      status: "unsupported",
      reason: "Seleções e anexos precisam de revisão manual nesta etapa.",
    };
    if (!native) {
      report.unsupported++;
      report.items.push(item);
      continue;
    }
    const control = element as NativeTextControl,
      descriptor = describeRuleField(control);
    const custom = resolutions.find((r) => r.fieldId === descriptor.fieldId);
    const match =
      control instanceof HTMLInputElement && !foreignContext(control)
        ? matchPersonalField(signals(control))
        : { score: 0, ambiguous: false };
    if (match.key || custom?.ruleId) report.recognized++;
    if (
      !canWrite(control) ||
      (preserveExisting && control.value.trim() !== "")
    ) {
      item.status = "preserved";
      item.reason = "Valor existente ou campo indisponível preservado.";
    } else if (foreignContext(control) || isBlockedSignals(signals(control))) {
      item.status = "review";
      item.reason = "Seção ou campo protegido. Revise manualmente.";
    } else if (custom?.mapped && !custom.ruleId) {
      item.status = "review";
      item.reason = custom.reason;
    } else if (match.ambiguous && !custom?.mapped) {
      item.status = "review";
      item.reason = "Identificações conflitantes. Revise manualmente.";
      highlight(control, "review");
    } else if (
      match.key &&
      !custom?.mapped &&
      (candidate[match.key] || !custom?.ruleId)
    ) {
      const answer = candidate[match.key],
        value = answer
          ? valueForPersonalField(
              match.key,
              answer,
              control.type,
              languageOf(control),
              descriptor.question,
            )
          : undefined;
      if (match.score < minimum || value === undefined || !value.trim()) {
        item.status = "review";
        item.reason =
          match.score < minimum
            ? "Confiança abaixo do limite configurado."
            : "Dado ausente, idioma ou tipo incompatível. Cadastre ou revise a resposta.";
        highlight(control, "review");
      } else {
        const result = await writeValue(control, value, preserveExisting);
        item.status = result.status;
        item.reason = result.reason;
        if (result.entry) batch.push(result.entry);
      }
    } else if (custom?.ruleId) {
      item.ruleName = custom.ruleName ?? custom.ruleId;
      item.score = custom.score;
      if (descriptor.fingerprint !== custom.fingerprint) {
        item.status = "review";
        item.reason =
          "Pergunta alterada durante a análise. Preencha novamente.";
      } else if (custom.decision === "skip" || custom.value === undefined) {
        item.status = "review";
        item.reason = custom.reason;
        highlight(control, "review");
      } else if (
        custom.decision === "suggest" ||
        control instanceof HTMLTextAreaElement
      ) {
        item.status = "review";
        item.reason = "Resposta salva sugerida. Insira somente após revisar.";
        const id = propose(descriptor, custom);
        if (id) {
          item.suggestionId = id;
          item.suggestionPreview =
            custom.value.length > 500
              ? custom.value.slice(0, 500) + "… [resposta completa ao inserir]"
              : custom.value;
        }
        highlight(control, "review");
      } else {
        const result = await writeValue(
          control,
          custom.value,
          preserveExisting,
          custom.decision === "fill-highlighted",
        );
        item.status = result.status;
        item.reason = result.reason;
        if (result.entry) batch.push(result.entry);
      }
    } else if (control instanceof HTMLTextAreaElement) {
      item.status = "unsupported";
      item.reason =
        "Texto longo sem sugestão correspondente. Revise manualmente.";
    } else {
      item.status = "unknown";
      item.reason = "Pergunta sem correspondência confiável.";
    }
    report[item.status]++;
    report.items.push(item);
  }
  remember(batch);
  report.undoAvailable = hasUndo();
  return report;
}
