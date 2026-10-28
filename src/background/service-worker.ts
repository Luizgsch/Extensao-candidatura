import { initializeStorage } from "../storage/repository";
import { isExtensionMessage } from "../shared/messaging";
import { analyzeActiveTab } from "./active-tab";
const ready = initializeStorage();
ready.catch(() =>
  console.error("Falha na inicialização do armazenamento local."),
);
chrome.runtime.onMessage.addListener(
  (message: unknown, sender, sendResponse) => {
    // Only extension-owned pages may command the active tab. Content scripts cannot.
    if (
      sender.id !== chrome.runtime.id ||
      !sender.url?.startsWith(chrome.runtime.getURL("")) ||
      !isExtensionMessage(message)
    )
      return false;
    void ready
      .then(async () => {
        if (message.type === "GET_STATUS")
          return { phase: 4, fillingEnabled: false, analysisEnabled: true };
        return analyzeActiveTab();
      })
      .then(sendResponse)
      .catch(() =>
        sendResponse({
          ok: false,
          error: "Armazenamento indisponível. Reabra a extensão.",
        }),
      );
    return true;
  },
);
