import { normalizeText } from "../normalization";
export type QuestionIntent =
  "experience" | "availability" | "authorization" | "certification";
export function questionIntent(text: string): QuestionIntent | undefined {
  const q = normalizeText(text);
  if (
    /\b(certificacao|certificado|certification|certified|certificate)\b/.test(q)
  )
    return "certification";
  if (
    /\b(autorizacao|autorizado|authorization|authorized|work permit)\b/.test(q)
  )
    return "authorization";
  if (
    /\b(disponibilidade|disponivel|mudanca|mudar|relocation|relocate|willing|available|aceita|accept|pode trabalhar|can you work)\b/.test(
      q,
    )
  )
    return "availability";
  if (
    /\b(experiencia|conhecimento|experience|knowledge|know|trabalhou|worked)\b/.test(
      q,
    )
  )
    return "experience";
  return undefined;
}
