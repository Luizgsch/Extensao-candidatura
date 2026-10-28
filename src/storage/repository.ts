import { createDefaultState } from "../defaults/state";
const KEY = "applicationState";
export async function initializeStorage(): Promise<void> {
  await chrome.storage.local.setAccessLevel({
    accessLevel: "TRUSTED_CONTEXTS",
  });
  const stored = await chrome.storage.local.get(KEY);
  if (stored[KEY] === undefined)
    await chrome.storage.local.set({ [KEY]: createDefaultState() });
}
