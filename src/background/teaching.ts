import { createDefaultState } from "../defaults/state";
import { parseState } from "../storage/schema";
import { activeRule } from "../core/matching/rules";
import { isBlockedSignals } from "../core/matching/personal-fields";
import { sameMappingTarget } from "../core/matching/learned";
import type { FieldMapping } from "../shared/types";
interface TeachingSession {
  id: string;
  url: string;
  expires: number;
  documentId?: string;
}
const sessionKey = (tabId: number) => "teaching:" + tabId;
chrome.tabs.onRemoved.addListener((tabId) => {
  void chrome.storage.session.remove(sessionKey(tabId)).catch(() => {});
});
const controlTypes = new Set([
  "text",
  "email",
  "tel",
  "url",
  "number",
  "date",
  "textarea",
  "select-one",
  "select-multiple",
  "radio",
  "checkbox",
  "checkbox-group",
  "combobox",
  "aria-checkbox",
  "aria-radio",
]);
export async function beginTeaching(
  tabId: number,
  url: string,
  documentId?: string,
) {
  const stored = await chrome.storage.local.get([
    "applicationState",
    "selectedProfileId",
  ]);
  const state =
    stored.applicationState === undefined
      ? createDefaultState()
      : parseState(stored.applicationState);
  const profile = state.profiles.find(
      (profile) => profile.id === stored.selectedProfileId,
    ),
    scope = {
      domain: new URL(url).hostname,
      ...(profile ? { profileId: profile.id } : {}),
    };
  const rules = state.rules
    .filter((rule) => activeRule(rule, scope))
    .map((rule) => ({ id: rule.id, name: rule.name, type: rule.answer.type }));
  if (!rules.length)
    return {
      ok: false,
      error:
        "Cadastre e ative uma resposta em Minhas respostas antes de ensinar.",
    };
  const parsedUrl = new URL(url);
  const session: TeachingSession = {
    id: crypto.randomUUID(),
    url: parsedUrl.origin + parsedUrl.pathname,
    expires: Date.now() + 10 * 60 * 1000,
    ...(documentId ? { documentId } : {}),
  };
  await chrome.storage.session.set({ [sessionKey(tabId)]: session });
  const result = await chrome.tabs.sendMessage(
    tabId,
    { type: "START_TEACHING", sessionId: session.id, rules },
    { frameId: 0 },
  );
  return result;
}
export async function saveTaughtField(
  message: unknown,
  sender: chrome.runtime.MessageSender,
) {
  if (
    sender.id !== chrome.runtime.id ||
    sender.tab?.id === undefined ||
    typeof message !== "object" ||
    message === null
  )
    return { ok: false, error: "Origem de ensino inválida." };
  const data = message as Record<string, unknown>,
    storedSession = await chrome.storage.session.get(sessionKey(sender.tab.id)),
    session = storedSession[sessionKey(sender.tab.id)] as
      TeachingSession | undefined;
  let currentUrl: string;
  try {
    const url = new URL(sender.url ?? "");
    currentUrl = url.origin + url.pathname;
  } catch {
    return { ok: false, error: "Página inválida." };
  }
  if (
    !session ||
    session.expires < Date.now() ||
    session.id !== data.sessionId ||
    currentUrl !== session.url ||
    (!!session.documentId && sender.documentId !== session.documentId)
  )
    return {
      ok: false,
      error: "Modo de ensino expirou ou página mudou. Abra Ensinar novamente.",
    };
  if (
    typeof data.ruleId !== "string" ||
    typeof data.onlyPath !== "boolean" ||
    typeof data.allowConsent !== "boolean" ||
    typeof data.fingerprint !== "object" ||
    data.fingerprint === null
  )
    return { ok: false, error: "Campo inválido." };
  const fingerprint = data.fingerprint as Record<string, unknown>;
  if (
    !controlTypes.has(String(fingerprint.controlType)) ||
    ["label", "name", "id", "section"].some(
      (key) =>
        fingerprint[key] !== undefined &&
        (typeof fingerprint[key] !== "string" ||
          (fingerprint[key] as string).length > 2000),
    ) ||
    !["label", "name", "id"].some(
      (key) =>
        typeof fingerprint[key] === "string" &&
        (fingerprint[key] as string).trim(),
    )
  )
    return { ok: false, error: "Campo sem identificação suficiente." };
  if (
    isBlockedSignals({
      label: String(fingerprint.label ?? ""),
      name: String(fingerprint.name ?? ""),
      id: String(fingerprint.id ?? ""),
      autocomplete: "",
      placeholder: "",
    })
  )
    return { ok: false, error: "Campo protegido; não pode ser ensinado." };
  return navigator.locks.request("candidaturas-state", async () => {
    const stored = await chrome.storage.local.get([
      "applicationState",
      "selectedProfileId",
    ]);
    const state =
      stored.applicationState === undefined
        ? createDefaultState()
        : parseState(stored.applicationState);
    const url = new URL(session.url),
      profile = state.profiles.find(
        (profile) => profile.id === stored.selectedProfileId,
      ),
      scope = {
        domain: url.hostname,
        ...(profile ? { profileId: profile.id } : {}),
      };
    const rule = state.rules.find((rule) => rule.id === data.ruleId);
    if (!rule || !activeRule(rule, scope))
      return {
        ok: false,
        error:
          "Resposta desativada, removida ou fora do perfil/site. Reabra Ensinar.",
      };
    const mapping: FieldMapping = {
      id: crypto.randomUUID(),
      domain: url.hostname,
      ...(data.onlyPath ? { pathPattern: url.pathname } : {}),
      fingerprint: {
        controlType: String(fingerprint.controlType),
        ...Object.fromEntries(
          ["label", "name", "id", "section"]
            .filter((key) => fingerprint[key] !== undefined)
            .map((key) => [key, fingerprint[key]]),
        ),
      },
      ruleId: rule.id,
      enabled: true,
      allowConsent: data.allowConsent === true,
    };
    const previous = state.mappings.find((item) =>
      sameMappingTarget(item, mapping),
    );
    if (previous) mapping.id = previous.id;
    state.mappings = state.mappings.filter(
      (item) => !sameMappingTarget(item, mapping),
    );
    state.mappings.push(mapping);
    const validated = parseState(state);
    if (
      new TextEncoder().encode(JSON.stringify(validated)).length >
      4 * 1024 * 1024
    )
      return { ok: false, error: "Limite local de dados excedido." };
    await chrome.storage.local.set({ applicationState: validated });
    await chrome.storage.session.remove(sessionKey(sender.tab!.id!));
    return { ok: true };
  });
}

export async function cancelTeaching(
  message: unknown,
  sender: chrome.runtime.MessageSender,
) {
  if (
    sender.id !== chrome.runtime.id ||
    sender.tab?.id === undefined ||
    typeof message !== "object" ||
    message === null ||
    !("sessionId" in message)
  )
    return { ok: false };
  const key = sessionKey(sender.tab.id),
    data = await chrome.storage.session.get(key),
    session = data[key] as TeachingSession | undefined;
  if (session?.id === message.sessionId)
    await chrome.storage.session.remove(key);
  return { ok: true };
}
