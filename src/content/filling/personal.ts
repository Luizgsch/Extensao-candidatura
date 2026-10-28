import { normalizeText } from "../../core/normalization";
import type { AnswerValue, Language } from "../../shared/types";
import {
  matchPersonalField,
  valueForPersonalField,
  type PersonalSignals,
} from "../../core/matching/personal-fields";
import type { FillReport, FieldOutcome } from "../../shared/filling";
import { visibleNativeControls } from "../detector/inventory";
import { canWrite, setNativeValue, highlight } from "../controls/native";
import { remember, hasUndo, type UndoEntry } from "../undo/history";
const supported = new Set(["text", "email", "tel", "url", "number", "date"]);
function signals(element: HTMLInputElement): PersonalSignals {
  const aria = element
    .getAttribute("aria-labelledby")
    ?.split(/\s+/)
    .map((id) => document.getElementById(id)?.textContent ?? "")
    .join(" ");
  return {
    label: (
      aria ||
      element.getAttribute("aria-label") ||
      [...(element.labels ?? [])]
        .map((label) => label.textContent ?? "")
        .join(" ")
    ).trim(),
    autocomplete: element.autocomplete,
    name: element.name,
    id: element.id,
    placeholder: element.placeholder,
  };
}
function foreignContext(element: Element): boolean {
  const fieldset = element.closest("fieldset");
  const section = element.closest('section,[role="group"]');
  const heading = [
    fieldset?.querySelector("legend")?.textContent,
    section?.getAttribute("aria-label"),
    section?.querySelector("h1,h2,h3,h4")?.textContent,
  ]
    .filter(Boolean)
    .join(" ");
  return /referenc|reference|emergency contact|contato de emergencia|dados da empresa|company details|experiencia profissional|work experience|employment history|formacao academica|education history/.test(
    normalizeText(heading),
  );
}
export function planPersonalFields(): string[] {
  return [
    ...new Set(
      visibleNativeControls(document)
        .filter(
          (element): element is HTMLInputElement =>
            element instanceof HTMLInputElement &&
            supported.has(element.type) &&
            !foreignContext(element),
        )
        .map((element) => matchPersonalField(signals(element)).key)
        .filter((key): key is string => !!key),
    ),
  ];
}
export async function fillPersonalFields(
  candidate: Record<string, AnswerValue>,
  minimum: number,
  preserveExisting: boolean,
): Promise<FillReport> {
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
    report.found++;
    if (
      !element.matches(":disabled") &&
      !("readOnly" in element && element.readOnly) &&
      element.type !== "file"
    )
      report.editable++;
    const label =
      element instanceof HTMLInputElement
        ? signals(element).label ||
          element.placeholder ||
          element.name ||
          element.id
        : element.getAttribute("aria-label") ||
          element.name ||
          element.tagName.toLowerCase();
    const item: FieldOutcome = {
      label: label.slice(0, 180) || "Campo sem identificação",
      status: "unsupported",
      reason:
        "Seleções, anexos e textos longos precisam de revisão manual nesta etapa.",
    };
    if (
      !(element instanceof HTMLInputElement) ||
      !supported.has(element.type)
    ) {
      report.unsupported++;
      report.items.push(item);
      continue;
    }
    const match = foreignContext(element)
      ? { score: 0, ambiguous: false }
      : matchPersonalField(signals(element));
    if ("key" in match && match.key) report.recognized++;
    if (
      !canWrite(element) ||
      (preserveExisting && element.value.trim() !== "")
    ) {
      item.status = "preserved";
      item.reason = "Valor existente ou campo indisponível preservado.";
      report.preserved++;
      report.items.push(item);
      continue;
    }
    if (foreignContext(element)) {
      item.status = "review";
      item.reason =
        "Seção de outra pessoa, empresa ou histórico profissional. Revise manualmente.";
      report.review++;
      report.items.push(item);
      continue;
    }

    if (match.ambiguous) {
      item.status = "review";
      item.reason = "Identificações conflitantes. Revise manualmente.";
      highlight(element, "review");
    } else if (!match.key) {
      item.status = "unknown";
      item.reason = "Pergunta não reconhecida pelo detector inicial.";
    } else {
      const answer = candidate[match.key];
      const language: Language = (
        element.closest("[lang]")?.getAttribute("lang") ??
        document.documentElement.lang
      )
        .toLowerCase()
        .startsWith("en")
        ? "en"
        : "pt-BR";
      const value = answer
        ? valueForPersonalField(match.key, answer, element.type, language)
        : undefined;
      if (match.score < minimum || value === undefined || !value.trim()) {
        item.status = "review";
        item.reason =
          match.score < minimum
            ? "Confiança abaixo do limite configurado."
            : "Dado ausente, idioma ou tipo incompatível. Cadastre ou revise a resposta.";
        highlight(element, "review");
      } else if (element.maxLength >= 0 && value.length > element.maxLength) {
        item.status = "review";
        item.reason = "Resposta excede o tamanho aceito pelo campo.";
      } else {
        const before = element.value;
        try {
          // Recheck immediately before writing; events may update other fields.
          if (
            !canWrite(element) ||
            (preserveExisting && element.value.trim() !== "")
          ) {
            item.status = "preserved";
            item.reason =
              "Campo alterado durante a operação; valor preservado.";
          } else {
            setNativeValue(element, value);
            await new Promise((resolve) => setTimeout(resolve, 0));
            if (!element.isConnected || element.value !== value) {
              item.status = "failed";
              item.reason = "O site não manteve o valor. Revise manualmente.";
            } else if (!element.validity.valid) {
              setNativeValue(element, before);
              item.status = "review";
              item.reason = "Resposta rejeitada pelas restrições do campo.";
              highlight(element, "review");
            } else {
              item.status = "filled";
              item.reason = "Preenchido com dado cadastrado.";
              highlight(element, "filled");
            }
          }
        } catch {
          item.status = "failed";
          item.reason = "Não foi possível atualizar o controle.";
        }
        if (element.isConnected && element.value !== before)
          batch.push({ element, before, applied: element.value });
      }
    }
    report[item.status]++;
    report.items.push(item);
  }
  remember(batch);
  report.undoAvailable = hasUndo();
  return report;
}
