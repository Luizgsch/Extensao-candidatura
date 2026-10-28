import { normalizeText } from "../normalization";
/** Recognizes only a narrow salary prompt; never removes negation globally. */
export function salaryPrompt(text: string): boolean {
  const normalized = normalizeText(
    text
      .replace(/&nbsp;|&#(?:160|x0*a0);/gi, " ")
      .replace(/^\s*\d{1,3}\s*[.)\-:]\s*/, ""),
  )
    .replace(/\s+(obrigatorio|obrigatoria|required)$/, "")
    .replace(/\s+nao colocar a combinar$/, "");
  return /^(qual (a )?sua )?pretensao salarial( clt)?$/.test(normalized);
}
