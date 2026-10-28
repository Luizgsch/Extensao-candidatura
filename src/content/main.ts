import { inspectPage } from "./detector/inventory";
import { planPersonalFields, fillPersonalFields } from "./filling/personal";
import { hasUndo, undoLast } from "./undo/history";
import type { FillReport } from "../shared/filling";
import type { AnswerValue } from "../shared/types";
declare global {
  interface Window {
    __candidaturasBridgeInstalled?: boolean;
  }
}
if (!window.__candidaturasBridgeInstalled) {
  window.__candidaturasBridgeInstalled = true;
  let report: FillReport | undefined;
  let queue = Promise.resolve();
  chrome.runtime.onMessage.addListener(
    (message: unknown, sender, sendResponse) => {
      if (
        sender.id !== chrome.runtime.id ||
        typeof message !== "object" ||
        message === null ||
        !("type" in message)
      )
        return false;
      if (message.type === "INSPECT_PAGE") {
        sendResponse(inspectPage(document));
        return false;
      }
      if (message.type === "PLAN_PERSONAL_FIELDS") {
        sendResponse(planPersonalFields());
        return false;
      }
      if (message.type === "GET_PAGE_SESSION") {
        sendResponse({
          ...(report ? { report } : {}),
          undoAvailable: hasUndo(),
        });
        return false;
      }
      if (
        message.type !== "FILL_PERSONAL_FIELDS" &&
        message.type !== "UNDO_PERSONAL_FIELDS"
      )
        return false;
      queue = queue
        .then(async () => {
          if (message.type === "UNDO_PERSONAL_FIELDS") {
            const result = await undoLast();
            report = undefined;
            sendResponse({ undo: result });
            return;
          }
          if (
            !("candidate" in message) ||
            typeof message.candidate !== "object" ||
            message.candidate === null ||
            !("minimum" in message) ||
            typeof message.minimum !== "number" ||
            !("preserveExisting" in message) ||
            typeof message.preserveExisting !== "boolean"
          ) {
            sendResponse({ error: "Mensagem de preenchimento inválida." });
            return;
          }
          report = await fillPersonalFields(
            message.candidate as Record<string, AnswerValue>,
            message.minimum,
            message.preserveExisting,
          );
          sendResponse({ report });
        })
        .catch(() =>
          sendResponse({
            error:
              "Falha ao atualizar campos. Revise a página antes de continuar.",
          }),
        );
      return true;
    },
  );
}
