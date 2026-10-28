import {
  selectionFields,
  selectionDescriptor,
  labelFor,
} from "../controls/selection-fields";
import { writeSelection } from "../controls/selection-write";
import { highlight } from "../controls/native";
import { remember, type UndoEntry } from "../undo/history";
import type { FillReport, FieldOutcome } from "../../shared/filling";
import type { RuleResolution } from "../../core/matching/rules";
import type { AppState } from "../../shared/types";
import { normalizeText } from "../../core/normalization";
export async function fillSelections(
  report: FillReport,
  resolutions: RuleResolution[],
  synonyms: AppState["synonyms"],
  preserveExisting: boolean,
) {
  const entries: UndoEntry[] = [];
  for (const field of selectionFields()) {
    report.found++;
    if (
      !field.members.some(
        (e) =>
          e.matches(":disabled") || e.getAttribute("aria-disabled") === "true",
      )
    )
      report.editable++;
    const descriptor = selectionDescriptor(field),
      resolution = resolutions.find((r) => r.fieldId === field.id);
    const item: FieldOutcome = {
      label: field.question,
      status: "review",
      reason: "Seleção sem correspondência confiável.",
    };
    if (resolution?.ruleId || resolution?.selectionValues) report.recognized++;
    if (resolution?.ruleName) item.ruleName = resolution.ruleName;
    if (resolution) item.score = resolution.score;
    const consent =
      /termo|privacidade|consent|policy|politica|marketing|newsletter|autoriz.*dados|declar|truthful|verdadeir|i agree/.test(
        normalizeText(
          field.question + " " + field.members.map(labelFor).join(" "),
        ),
      );
    if (!resolution) {
      item.status = "unknown";
      item.reason = "Resposta não cadastrada ou pergunta não reconhecida.";
    } else if (resolution.fingerprint !== descriptor.fingerprint) {
      item.reason = "Opções ou pergunta alteradas. Preencha novamente.";
    } else if (consent && !resolution.consentApproved) {
      item.reason =
        "Aceite ou declaração exige regra explícita para a pergunta completa.";
    } else if (
      resolution.decision === "skip" ||
      resolution.decision === "suggest" ||
      !resolution.selectionValues
    ) {
      item.reason =
        resolution.decision === "suggest"
          ? "Seleção sugerida; revise e escolha manualmente no site."
          : resolution.reason;
    } else {
      const result = await writeSelection(
        field,
        resolution.selectionValues,
        synonyms,
        preserveExisting,
      );
      item.status = result.status;
      item.reason = result.reason;
      if (result.entry) entries.push(result.entry);
      if (result.status === "filled")
        highlight(
          field.root,
          resolution.decision === "fill-highlighted" ? "review" : "filled",
        );
    }
    report[item.status]++;
    report.items.push(item);
  }
  remember(entries);
}
