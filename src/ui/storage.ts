import { createDefaultState } from "../defaults/state";
import type { AppState } from "../shared/types";
export const preview = typeof chrome === "undefined" || !chrome.storage?.local;
let memory = createDefaultState();
export async function loadState(): Promise<AppState> {
  if (preview) return structuredClone(memory);
  const stored = await chrome.storage.local.get("applicationState");
  const value = stored.applicationState;
  if (value === undefined) return createDefaultState();
  if (
    typeof value !== "object" ||
    value === null ||
    !("schemaVersion" in value) ||
    value.schemaVersion !== 1
  )
    throw new Error("Versão dos dados incompatível. Dados preservados.");
  return value as AppState;
}
export async function saveState(state: AppState): Promise<void> {
  if (preview) {
    memory = structuredClone(state);
    return;
  }
  await chrome.storage.local.set({ applicationState: state });
}
