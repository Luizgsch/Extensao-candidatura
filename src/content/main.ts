import {
  selectionFields,
  selectionDescriptor,
} from "./controls/selection-fields";
import { fillSelections } from "./filling/selections";
import { beginUndoOperation, endUndoOperation } from "./undo/history";
import { watchDynamicFields, hasDynamicChanges } from "./observer/dynamic";
import type { AppState } from "../shared/types";
import { inspectPage } from "./detector/inventory";
import { planPersonalFields, fillPersonalFields } from "./filling/personal";
import { planRuleFields } from "./context/fields";
import {
  suggestionPlan,
  applySuggestion,
  clearSuggestions,
} from "./filling/suggestions";
import { hasUndo, undoLast } from "./undo/history";
import type { FillReport } from "../shared/filling";
import type { RuleResolution } from "../core/matching/rules";
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
      if (message.type === "PLAN_RULE_FIELDS") {
        sendResponse([
          ...planRuleFields(),
          ...selectionFields().map(selectionDescriptor),
        ]);
        return false;
      }
      if (message.type === "GET_PAGE_SESSION") {
        sendResponse({
          ...(report ? { report } : {}),
          undoAvailable: hasUndo(),
          dynamicChanges: hasDynamicChanges(),
        });
        return false;
      }
      if (
        message.type === "GET_SUGGESTION_PLAN" &&
        "suggestionId" in message &&
        typeof message.suggestionId === "string"
      ) {
        sendResponse(suggestionPlan(message.suggestionId) ?? null);
        return false;
      }
      if (
        ![
          "FILL_PERSONAL_FIELDS",
          "UNDO_PERSONAL_FIELDS",
          "APPLY_SUGGESTION",
        ].includes(String(message.type))
      )
        return false;
      queue = queue
        .then(async () => {
          if (message.type === "UNDO_PERSONAL_FIELDS") {
            const result = await undoLast();
            clearSuggestions();
            report = undefined;
            sendResponse({ undo: result });
            return;
          }
          if (message.type === "APPLY_SUGGESTION") {
            if (
              !("suggestionId" in message) ||
              typeof message.suggestionId !== "string" ||
              !("resolution" in message)
            ) {
              sendResponse({ ok: false, error: "Sugestão inválida." });
              return;
            }
            const id = message.suggestionId;
            const applied = await applySuggestion(
              id,
              message.resolution as RuleResolution,
            );
            if (!applied.ok) {
              sendResponse(applied);
              return;
            }
            const item = report?.items.find((item) => item.suggestionId === id);
            if (report && item) {
              report.review--;
              item.status = applied.result.status;
              item.reason = applied.result.reason;
              delete item.suggestionId;
              delete item.suggestionPreview;
              report[item.status]++;
              report.undoAvailable = hasUndo();
            }
            sendResponse({ ok: true, ...(report ? { report } : {}) });
            return;
          }
          if (
            !("candidate" in message) ||
            typeof message.candidate !== "object" ||
            message.candidate === null ||
            !("minimum" in message) ||
            typeof message.minimum !== "number" ||
            !("preserveExisting" in message) ||
            typeof message.preserveExisting !== "boolean" ||
            !("resolutions" in message) ||
            !Array.isArray(message.resolutions) ||
            !("synonyms" in message) ||
            typeof message.synonyms !== "object" ||
            message.synonyms === null
          ) {
            sendResponse({ error: "Mensagem de preenchimento inválida." });
            return;
          }
          watchDynamicFields();
          beginUndoOperation();
          try {
            report = await fillPersonalFields(
              message.candidate as Record<string, AnswerValue>,
              message.minimum,
              message.preserveExisting,
              message.resolutions as RuleResolution[],
            );
            await fillSelections(
              report,
              message.resolutions as RuleResolution[],
              message.synonyms as AppState["synonyms"],
              message.preserveExisting,
            );
          } finally {
            endUndoOperation();
          }
          report.undoAvailable = hasUndo();
          report.dynamicChanges = hasDynamicChanges();
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
