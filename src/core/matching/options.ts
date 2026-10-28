import { normalizeText } from "../normalization";
import { canonicalize } from "./rules";
import type { AppState, AnswerValue } from "../../shared/types";
const equivalents: Record<string, string> = {
  sim: "yes",
  yes: "yes",
  true: "yes",
  nao: "no",
  no: "no",
  false: "no",
  basico: "basic",
  basic: "basic",
  intermediario: "intermediate",
  intermediate: "intermediate",
  avancado: "advanced",
  advanced: "advanced",
  fluente: "fluent",
  fluent: "fluent",
  brasil: "brazil",
  brazil: "brazil",
  br: "brazil",
};
export function optionMeaning(
  text: string,
  synonyms: AppState["synonyms"],
): string {
  const normalized = normalizeText(canonicalize(text, synonyms));
  return equivalents[normalized] ?? normalized;
}
export function findOption(
  values: string[],
  options: { id: string; label: string; value: string; disabled?: boolean }[],
  synonyms: AppState["synonyms"],
): string[] | undefined {
  const result: string[] = [];
  for (const value of values) {
    const expected = optionMeaning(value, synonyms);
    if (!expected) return undefined;
    const matches = options.filter(
      (option) =>
        !option.disabled &&
        (optionMeaning(option.label, synonyms) === expected ||
          (option.value !== "" &&
            optionMeaning(option.value, synonyms) === expected)),
    );
    if (matches.length !== 1) return undefined;
    result.push(matches[0]!.id);
  }
  return [...new Set(result)];
}
export function selectionPersonalKey(question: string): string | undefined {
  const q = normalizeText(question).replace(
    /^(voce )?(possui|tem|aceita|e) /,
    "",
  );
  const aliases: Record<string, string> = {
    "disponibilidade para mudanca": "relocation",
    "disponibilidade para trabalho presencial": "onsite",
    "disponibilidade presencial": "onsite",
    "disponibilidade para trabalho hibrido": "hybrid",
    "disponibilidade hibrida": "hybrid",
    "disponibilidade para trabalho remoto": "remote",
    "disponibilidade remota": "remote",
    "nivel de ingles": "englishLevel",
    "english level": "englishLevel",
    "pessoa com deficiencia": "disability",
    pcd: "disability",
    "necessidade de acessibilidade": "accessibility",
    genero: "gender",
    gender: "gender",
    "orientacao sexual": "orientation",
    "raca cor": "race",
    tecnologias: "technologies",
    technologies: "technologies",
    estado: "state",
    pais: "country",
    country: "country",
    state: "state",
  };
  return aliases[q];
}
export function selectionValues(
  answer: AnswerValue,
  language: "pt-BR" | "en",
  key?: string,
): string[] | undefined {
  if (answer.type === "boolean")
    return [
      answer.value
        ? language === "en"
          ? "Yes"
          : "Sim"
        : language === "en"
          ? "No"
          : "Não",
    ];
  if (answer.type === "multiple-choice") return answer.value;
  if (
    answer.type === "long-text" ||
    answer.type === "salary" ||
    answer.type === "date"
  )
    return undefined;
  if (answer.type === "text") {
    const value = answer.value[language] ?? answer.value["pt-BR"];
    return value
      ? key === "technologies"
        ? value
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [value]
      : undefined;
  }
  return [String(answer.value)];
}
