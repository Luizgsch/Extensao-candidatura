import { saveTaughtField, cancelTeaching } from "./teaching";
import { initializeStorage } from "../storage/repository";
import { isExtensionMessage } from "../shared/messaging";
import { actOnActiveTab } from "./active-tab";
const ready = initializeStorage();
ready.catch(() =>
  console.error("Falha na inicialização do armazenamento local."),
);
chrome.runtime.onMessage.addListener(
  (message: unknown, sender, sendResponse) => {
    if (
      typeof message === "object" &&
      message !== null &&
      "type" in message &&
      ["SAVE_TAUGHT_FIELD", "CANCEL_TEACHING"].includes(String(message.type))
    ) {
      void ready
        .then(() =>
          message.type === "SAVE_TAUGHT_FIELD"
            ? saveTaughtField(message, sender)
            : cancelTeaching(message, sender),
        )
        .then(sendResponse)
        .catch(() =>
          sendResponse({
            ok: false,
            error: "Não foi possível salvar a associação.",
          }),
        );
      return true;
    }
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
          return { phase: 9, fillingEnabled: true, analysisEnabled: true };
        return actOnActiveTab(message.type, message.suggestionId);
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
