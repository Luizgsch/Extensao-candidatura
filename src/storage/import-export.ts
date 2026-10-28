import { parseState } from "./schema";
import { createDefaultState } from "../defaults/state";
import type { AppState } from "../shared/types";
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export function exportBackup(
  state: AppState,
  includePersonal: boolean,
): string {
  const source = parseState(state);
  const data = includePersonal
    ? { ...source, logs: [] }
    : {
        ...createDefaultState(),
        settings: source.settings,
        synonyms: source.synonyms,
      };
  return JSON.stringify({
    format: "candidaturas-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    scope: includePersonal ? "complete" : "preferences",
    data,
  });
}
export function importBackup(text: string): AppState {
  if (new TextEncoder().encode(text).length > MAX_IMPORT_BYTES)
    throw new Error("Arquivo excede o limite de 5 MB.");
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("JSON inválido. Selecione um backup da extensão.");
  }
  if (
    typeof value !== "object" ||
    value === null ||
    !("format" in value) ||
    value.format !== "candidaturas-backup" ||
    !("version" in value) ||
    value.version !== 1 ||
    !("scope" in value) ||
    !["complete", "preferences"].includes(String(value.scope)) ||
    !("data" in value)
  )
    throw new Error("Formato ou versão de backup incompatível.");
  return parseState(value.data);
}
