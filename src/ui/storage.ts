import { createDefaultState } from "../defaults/state";
import { parseState } from "../storage/schema";
import type { AppState } from "../shared/types";
export const preview = typeof chrome === "undefined" || !chrome.storage?.local;
let memory = createDefaultState();
let loadedSnapshot: string | undefined;
function snapshot(value: unknown): string | undefined {
  return JSON.stringify(value, (_key, entry) =>
    entry && typeof entry === "object" && !Array.isArray(entry)
      ? Object.fromEntries(
          Object.keys(entry)
            .sort()
            .map((key) => [key, entry[key]]),
        )
      : entry,
  );
}
export async function loadState(): Promise<AppState> {
  if (preview) return structuredClone(memory);
  const stored = await chrome.storage.local.get("applicationState");
  loadedSnapshot = snapshot(stored.applicationState);
  return stored.applicationState === undefined
    ? createDefaultState()
    : parseState(stored.applicationState);
}
export async function saveState(state: AppState): Promise<void> {
  const validated = parseState(state);
  if (
    new TextEncoder().encode(JSON.stringify(validated)).length >
    4 * 1024 * 1024
  )
    throw new Error(
      "Limite de dados de 4 MB excedido. Reduza descrições ou registros.",
    );
  if (preview) {
    memory = structuredClone(validated);
    return;
  }
  await navigator.locks.request("candidaturas-state", async () => {
    const current = await chrome.storage.local.get("applicationState");
    if (snapshot(current.applicationState) !== loadedSnapshot)
      throw new Error(
        "Os dados foram alterados em outra aba. Reabra as configurações antes de salvar. Suas edições não foram gravadas.",
      );
    await chrome.storage.local.set({ applicationState: validated });
    loadedSnapshot = snapshot(validated);
  });
}
export async function clearAllData(): Promise<void> {
  if (preview) {
    memory = createDefaultState();
    return;
  }
  await navigator.locks.request("candidaturas-state", async () => {
    await chrome.storage.local.clear();
    await chrome.storage.session.clear();
    loadedSnapshot = undefined;
  });
}
