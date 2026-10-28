import {
  canWrite,
  setNativeValue,
  highlight,
  type NativeTextControl,
} from "../controls/native";
import type { UndoEntry } from "../undo/history";
export async function writeValue(
  element: NativeTextControl,
  value: string,
  preserveExisting: boolean,
  medium = false,
): Promise<{
  status: "filled" | "review" | "failed" | "preserved";
  reason: string;
  entry?: UndoEntry;
}> {
  if (!canWrite(element) || (preserveExisting && element.value.trim()))
    return {
      status: "preserved",
      reason: "Valor existente ou campo indisponível preservado.",
    };
  if (element.maxLength >= 0 && value.length > element.maxLength)
    return {
      status: "review",
      reason: "Resposta excede o tamanho aceito pelo campo.",
    };
  const before = element.value;
  let result: {
    status: "filled" | "review" | "failed" | "preserved";
    reason: string;
    entry?: UndoEntry;
  };
  try {
    setNativeValue(element, value);
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (!element.isConnected || element.value !== value)
      result = {
        status: "failed",
        reason: "O site não manteve o valor. Revise manualmente.",
      };
    else if (!element.validity.valid) {
      setNativeValue(element, before);
      result = {
        status: "review",
        reason: "Resposta rejeitada pelas restrições do campo.",
      };
      highlight(element, "review");
    } else {
      result = {
        status: "filled",
        reason: medium
          ? "Preenchido com confiança intermediária. Revise antes de enviar."
          : "Preenchido com resposta cadastrada.",
      };
      highlight(element, medium ? "review" : "filled");
    }
  } catch {
    result = {
      status: "failed",
      reason: "Não foi possível atualizar o controle.",
    };
  }
  if (element.isConnected && element.value !== before)
    result.entry = { element, before, applied: element.value };
  return result;
}
