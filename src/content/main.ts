import { inspectPage } from "./detector/inventory";
declare global {
  interface Window {
    __candidaturasBridgeInstalled?: boolean;
  }
}
if (!window.__candidaturasBridgeInstalled) {
  window.__candidaturasBridgeInstalled = true;
  chrome.runtime.onMessage.addListener(
    (message: unknown, sender, sendResponse) => {
      if (
        sender.id !== chrome.runtime.id ||
        typeof message !== "object" ||
        message === null ||
        !("type" in message) ||
        message.type !== "INSPECT_PAGE"
      )
        return false;
      sendResponse(inspectPage(document));
      return false;
    },
  );
}
