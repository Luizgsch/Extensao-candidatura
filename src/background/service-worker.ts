import { initializeStorage } from "../storage/repository";
import { isExtensionMessage } from "../shared/messaging";
const ready = initializeStorage();
ready.catch(() =>
  console.error("Falha na inicialização do armazenamento local."),
);
chrome.runtime.onMessage.addListener(
  (message: unknown, sender, sendResponse) => {
    if (sender.id !== chrome.runtime.id || !isExtensionMessage(message))
      return false;
    void ready
      .then(() => sendResponse({ phase: 2, fillingEnabled: false }))
      .catch(() => sendResponse({ error: "STORAGE_UNAVAILABLE" }));
    return true;
  },
);
