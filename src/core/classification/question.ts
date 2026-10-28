import { normalizeText } from "../normalization";
import type { AnswerType } from "../../shared/types";
export function expectedAnswerType(
  question: string,
  controlType: string,
): AnswerType | undefined {
  const q = normalizeText(question);
  if (
    /\b(conte|descreva|explique|fale sobre|por que|porque|tell us|describe|explain|why|cover letter)\b/.test(
      q,
    )
  )
    return "long-text";
  if (
    /\b(quantos anos|quantas anos|ha quanto tempo|quanto tempo|how many years|how long)\b/.test(
      q,
    )
  )
    return "experience-years";
  if (
    /^(voce )?(possui|tem|aceita|autoriza|esta ciente|esta disponivel|pode|consegue|ja trabalhou)\b/.test(
      q,
    ) ||
    /^(do you|have you|are you|can you|will you|would you|did you|is it)\b/.test(
      q,
    )
  )
    return "boolean";
  if (
    /\b(pretensao salarial|expectativa salarial|salario|remuneracao|salary|compensation|expected pay)\b/.test(
      q,
    )
  )
    return "salary";
  if (/\b(anos de experiencia|years of experience|experience years)\b/.test(q))
    return "experience-years";
  if (/\b(nivel|level)\b/.test(q)) return "single-choice";
  if (controlType === "email") return "email";
  if (controlType === "url") return "url";
  if (controlType === "tel") return "phone";
  if (controlType === "date") return "date";
  if (controlType === "number" || /^(quantos|quantas|how many)\b/.test(q))
    return "number";
  return undefined;
}
export function compatibleAnswerType(
  expected: AnswerType | undefined,
  actual: AnswerType,
): boolean {
  if (!expected) return true;
  if (expected === "experience-years" || expected === "number")
    return actual === "number" || actual === "experience-years";
  if (expected === "single-choice")
    return actual === "single-choice" || actual === "text";
  if (expected === "long-text")
    return actual === "long-text" || actual === "text";
  return expected === actual;
}
