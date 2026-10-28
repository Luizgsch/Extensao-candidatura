import { normalizeText } from "../normalization";
import {
  resolveRule,
  activeRule,
  type RuleField,
  type RuleScope,
  type RuleResolution,
} from "./rules";
import type { AppState, FieldMapping } from "../../shared/types";
function identity(mapping: FieldMapping): string {
  const f = mapping.fingerprint;
  return JSON.stringify([
    mapping.domain.trim().toLowerCase(),
    mapping.pathPattern || null,
    f.controlType,
    normalizeText(f.label ?? ""),
    f.name ?? "",
    f.id ?? "",
    normalizeText(f.section ?? ""),
  ]);
}
export function sameMappingTarget(a: FieldMapping, b: FieldMapping): boolean {
  return identity(a) === identity(b);
}
function targetMatches(
  mapping: FieldMapping,
  field: RuleField,
  all: RuleField[],
  pathname: string,
): boolean {
  const saved = mapping.fingerprint,
    current = field.mappingFingerprint;
  if (!current || saved.controlType !== current.controlType) return false;
  const label = normalizeText(saved.label ?? ""),
    now = normalizeText(current.label ?? "");
  if (label !== now) return false;
  const labelSame = !!label && label === now,
    idSame = !!saved.id && saved.id === current.id,
    nameSame = !!saved.name && saved.name === current.name,
    sectionSame =
      !!saved.section &&
      normalizeText(saved.section) === normalizeText(current.section ?? "");
  if (saved.name && current.name && saved.name !== current.name) return false;
  if (
    saved.section &&
    current.section &&
    normalizeText(saved.section) !== normalizeText(current.section)
  )
    return false;
  const peers = all.filter(
    (other) =>
      other.mappingFingerprint?.controlType === current.controlType &&
      normalizeText(other.mappingFingerprint.label ?? "") === label,
  );
  const exactIds = saved.id
    ? peers.filter((other) => other.mappingFingerprint?.id === saved.id)
    : [];
  if (exactIds.length)
    return idSame && exactIds.length === 1 && (labelSame || nameSame);
  if (
    labelSame &&
    nameSame &&
    peers.filter((other) => other.mappingFingerprint?.name === saved.name)
      .length === 1
  )
    return true;
  if (
    labelSame &&
    sectionSame &&
    peers.filter(
      (other) =>
        normalizeText(other.mappingFingerprint?.section ?? "") ===
        normalizeText(current.section ?? ""),
    ).length === 1
  )
    return true;
  if (mapping.pathPattern !== pathname) return false;
  const comparable = all.filter(
    (other) =>
      other.mappingFingerprint?.controlType === current.controlType &&
      (labelSame
        ? normalizeText(other.mappingFingerprint.label ?? "") === label
        : idSame
          ? other.mappingFingerprint.id === saved.id
          : false),
  );
  return comparable.length === 1 && (labelSame || idSame);
}
export function resolveLearned(
  field: RuleField,
  state: AppState,
  scope: RuleScope,
  pathname: string,
  all: RuleField[],
): RuleResolution | undefined {
  const mappings = state.mappings.filter(
    (mapping) =>
      mapping.enabled &&
      mapping.domain.toLowerCase() === scope.domain.toLowerCase() &&
      (!mapping.pathPattern || mapping.pathPattern === pathname) &&
      targetMatches(mapping, field, all, pathname),
  );
  if (!mappings.length) return undefined;
  const base: RuleResolution = {
    fieldId: field.fieldId,
    fingerprint: field.fingerprint,
    score: 0,
    decision: "skip",
    reason: "Mapeamento aprendido exige revisão.",
    mapped: true,
  };
  const ids = [...new Set(mappings.map((mapping) => mapping.ruleId))];
  if (ids.length !== 1)
    return {
      ...base,
      reason:
        "Mapeamentos conflitantes para o campo. Revise em Campos ensinados.",
    };
  const rule = state.rules.find((rule) => rule.id === ids[0]);
  if (!rule || !activeRule(rule, scope))
    return {
      ...base,
      reason: "Resposta ensinada desativada ou fora do perfil/site atual.",
    };
  const q = normalizeText(field.question),
    explicit = rule.keywords.some((keyword) => normalizeText(keyword) === q);
  const constrained =
    /\b(nao|not|never|without|sem|nenhum|nenhuma)\b/.test(q) ||
    (field.language === "en" && /\bno\b/.test(q)) ||
    /\b(e|and|ou|or)\b/.test(q) ||
    /[;,]/.test(field.question) ||
    (rule.answer.type === "boolean" && /\d/.test(field.question));
  if (constrained && !explicit)
    return {
      ...base,
      reason:
        "Pergunta negativa, composta ou com requisito numérico exige resposta específica com pergunta completa.",
    };
  const adapted = {
    ...rule,
    subject: field.question,
    keywords: [field.question],
  };
  const result = resolveRule(field, { ...state, rules: [adapted] }, scope);
  return {
    ...result,
    mapped: true,
    reason:
      result.decision === "skip"
        ? result.reason
        : "Mapeamento ensinado neste site. " + result.reason,
    consentApproved:
      explicit || mappings.some((mapping) => mapping.allowConsent === true),
  };
}
