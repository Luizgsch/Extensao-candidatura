import type { AnswerType, AnswerValue } from "../shared/types";
export function editAnswer(
  previous: AnswerValue | undefined,
  value: string,
  expected: AnswerType,
): AnswerValue | undefined {
  if (!value) return undefined;
  const type = previous?.type ?? expected;
  if (type === "text" || type === "long-text")
    return {
      type,
      value: {
        ...(previous?.type === "text" || previous?.type === "long-text"
          ? previous.value
          : {}),
        "pt-BR": value,
      },
    };
  if (type === "boolean") {
    if (!["true", "false"].includes(value))
      throw new Error("Selecione Sim ou Não.");
    return { type, value: value === "true" };
  }
  if (type === "number" || type === "experience-years" || type === "salary") {
    const n = Number(value.replace(",", "."));
    if (!Number.isFinite(n) || n < 0)
      throw new Error("Informe um número válido maior ou igual a zero.");
    return type === "salary"
      ? {
          type,
          value: n,
          currency: previous?.type === "salary" ? previous.currency : "BRL",
          period: previous?.type === "salary" ? previous.period : "month",
        }
      : { type, value: n };
  }
  if (type === "multiple-choice")
    return {
      type,
      value: value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    };
  return { type, value };
}
