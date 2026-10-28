import { questionIntent } from "../classification/intent";
import { normalizeText, containsPhrase } from "../normalization";
import {
  expectedAnswerType,
  compatibleAnswerType,
} from "../classification/question";
import { decideMatch } from "../confidence";
import type {
  AnswerRule,
  AnswerValue,
  AppState,
  Language,
  MatchResult,
} from "../../shared/types";
export interface RuleField {
  fieldId: string;
  question: string;
  controlType: string;
  language: Language;
  fingerprint: string;
}
export interface RuleResolution {
  fieldId: string;
  fingerprint: string;
  ruleId?: string;
  ruleName?: string;
  score: number;
  decision: MatchResult["decision"];
  reason: string;
  value?: string;
}
export interface RuleScope {
  domain: string;
  profileId?: string;
}
const stop = new Set(
  "voce voces seu sua seus suas o a os as um uma de do da dos das em no na nos nas com para por pelo pela e ou que qual quais quanto quantos quantas possui tem experiencia conhecimento anos ano tempo nivel eu ja trabalhou trabalha trabalhar utilizando usando utiliza possui conhecimento the a an your you do does have has are is of in on with for to and or what how many much experience knowledge years year time level know worked work using use can willing disponibilidade aceita aceitar autoriza esta ciente disponivel pode consegue available able ha long técnico tecnico".split(
    " ",
  ),
);
function significant(text: string): string[] {
  return normalizeText(text)
    .split(" ")
    .filter((word) => word && !stop.has(word));
}
export function canonicalize(
  text: string,
  synonyms: AppState["synonyms"],
): string {
  const variants = new Map<string, Set<string>>();
  for (const dictionary of Object.values(synonyms))
    for (const [key, aliases] of Object.entries(dictionary))
      for (const alias of [key, ...aliases]) {
        const token = normalizeText(alias),
          canonical = normalizeText(key);
        if (!token || !canonical) continue;
        const keys = variants.get(token) ?? new Set<string>();
        keys.add(canonical);
        variants.set(token, keys);
      }
  const entries = [...variants]
    .filter(([, keys]) => keys.size === 1)
    .map(([alias, keys]) => ({
      words: alias.split(" "),
      canonical: [...keys][0]!,
    }))
    .sort((a, b) => b.words.length - a.words.length);
  const words = normalizeText(text).split(" ");
  const result: string[] = [];
  for (let index = 0; index < words.length;) {
    const found = entries.find((entry) =>
      entry.words.every((word, offset) => words[index + offset] === word),
    );
    if (found) {
      result.push(found.canonical);
      index += found.words.length;
    } else {
      result.push(words[index]!);
      index++;
    }
  }
  return result.join(" ");
}
export function activeRule(rule: AnswerRule, scope: RuleScope): boolean {
  return (
    rule.enabled &&
    (!rule.domains ||
      rule.domains.some(
        (domain) => domain.trim().toLowerCase() === scope.domain.toLowerCase(),
      )) &&
    (!rule.profileIds ||
      (!!scope.profileId && rule.profileIds.includes(scope.profileId)))
  );
}
function formattedAnswer(
  answer: AnswerValue,
  field: RuleField,
): string | undefined {
  if (
    field.controlType === "number" &&
    !["number", "experience-years", "salary"].includes(answer.type)
  )
    return undefined;
  if (
    ["email", "url", "tel", "date"].includes(field.controlType) &&
    answer.type !==
      (
        { email: "email", url: "url", tel: "phone", date: "date" } as Record<
          string,
          string
        >
      )[field.controlType]
  )
    return undefined;
  if (answer.type === "text" || answer.type === "long-text")
    return answer.value[field.language] || undefined;
  if (answer.type === "multiple-choice") return undefined;
  if (answer.type === "boolean")
    return field.language === "en"
      ? answer.value
        ? "Yes"
        : "No"
      : answer.value
        ? "Sim"
        : "Não";
  if (answer.type === "salary") {
    const q = normalizeText(field.question);
    const period = /\b(anual|ano|annual|yearly|per year)\b/.test(q)
      ? "year"
      : /\b(hora|hourly|per hour)\b/.test(q)
        ? "hour"
        : /\b(mensal|mes|monthly|per month)\b/.test(q)
          ? "month"
          : undefined;
    if (period && period !== answer.period) return undefined;
    const currency =
      field.question.match(/\b(BRL|USD|EUR|GBP|CAD)\b/i)?.[1]?.toUpperCase() ??
      (/R\$/.test(field.question)
        ? "BRL"
        : /US\$/.test(field.question)
          ? "USD"
          : undefined);
    if (currency && currency !== answer.currency) return undefined;
    if (field.question.includes("$") && !currency) return undefined;
    return String(answer.value);
  }
  if (
    field.controlType === "number" &&
    !["number", "experience-years"].includes(answer.type)
  )
    return undefined;
  if (field.controlType === "date" && answer.type !== "date") return undefined;
  if (
    ["email", "url", "tel"].includes(field.controlType) &&
    answer.type !==
      ({ email: "email", url: "url", tel: "phone" } as Record<string, string>)[
        field.controlType
      ]
  )
    return undefined;
  return String(answer.value);
}
export function resolveRule(
  field: RuleField,
  state: AppState,
  scope: RuleScope,
): RuleResolution {
  const question = canonicalize(field.question, state.synonyms),
    expected = expectedAnswerType(field.question, field.controlType);
  const ranked: {
    rule: AnswerRule;
    score: number;
    value: string | undefined;
    suggestionOnly: boolean;
  }[] = [];
  for (const original of state.rules) {
    if (!activeRule(original, scope)) continue;
    const profile = scope.profileId
      ? state.profiles.find((profile) => profile.id === scope.profileId)
      : undefined;
    const rule = {
      ...original,
      answer: profile?.answerOverrides[original.id] ?? original.answer,
    };
    if (!compatibleAnswerType(expected, rule.answer.type)) continue;
    if (
      rule.excludedKeywords.some(
        (keyword) =>
          containsPhrase(question, canonicalize(keyword, state.synonyms)) ||
          containsPhrase(field.question, keyword),
      )
    )
      continue;
    const keywords = rule.keywords
      .map((keyword) => canonicalize(keyword, state.synonyms))
      .filter(Boolean);
    if (!keywords.length) continue;
    const exact = keywords.includes(question);
    const intent = questionIntent(field.question),
      declaredIntent = questionIntent(
        rule.name + " " + rule.subject + " " + rule.keywords.join(" "),
      );
    if (
      intent &&
      intent !== declaredIntent &&
      intent !== "experience" &&
      !exact
    )
      continue;
    const topic = significant(canonicalize(rule.subject, state.synonyms));
    const explicitStory =
      expected === "long-text" &&
      exact &&
      normalizeText(field.question).split(" ").length >= 3;
    if (
      (!topic.length ||
        !topic.every((token) => containsPhrase(question, token))) &&
      !explicitStory
    )
      continue;
    const unsafe =
      /\b(nao|not|never|without|sem|nenhum|nenhuma)\b/.test(
        normalizeText(field.question),
      ) ||
      /\b(e|and|ou|or)\b/.test(normalizeText(field.question)) ||
      /[;,]/.test(field.question) ||
      (rule.answer.type === "boolean" && /\d/.test(field.question));
    if (
      (unsafe ||
        (field.language === "en" &&
          /\bno\b/.test(normalizeText(field.question)))) &&
      !rule.keywords.some(
        (keyword) => normalizeText(keyword) === normalizeText(field.question),
      )
    )
      continue;
    let coverage = 0;
    for (const keyword of keywords) {
      const words = keyword.split(" ");
      coverage = Math.max(
        coverage,
        words.filter((word) => containsPhrase(question, word)).length /
          words.length,
      );
    }
    if (coverage < 0.5) continue;
    const available = significant(keywords.join(" "));
    const residual = significant(question).filter(
      (word) => !topic.includes(word) && !available.includes(word),
    );
    let score = exact
      ? 99
      : Math.min(97, Math.round(78 + 12 * coverage + (expected ? 5 : 0) + 5));
    if (residual.length && !exact) continue;
    if (!expected && !exact) score = Math.min(score, 79);
    const value = formattedAnswer(rule.answer, field);
    const suggestionOnly =
      rule.insertion === "suggestion" ||
      rule.answer.type === "long-text" ||
      expected === "long-text" ||
      field.controlType === "textarea" ||
      (!expected && !exact);
    ranked.push({ rule, score, value, suggestionOnly });
  }
  ranked.sort(
    (a, b) =>
      b.score - a.score ||
      b.rule.priority - a.rule.priority ||
      a.rule.id.localeCompare(b.rule.id),
  );
  const decision = decideMatch(
    field.fieldId,
    ranked.map((item) => ({
      ruleId: item.rule.id,
      score: item.score,
      suggestionOnly: item.suggestionOnly,
      priority: item.rule.priority,
    })),
    state.settings.confidence,
  );
  const chosen = ranked.find((item) => item.rule.id === decision.ruleId);
  const base: RuleResolution = {
    fieldId: field.fieldId,
    fingerprint: field.fingerprint,
    score: decision.score,
    decision: decision.decision,
    reason:
      decision.reasons.join(" ") ||
      "Correspondência por assunto, palavras-chave e tipo.",
  };
  if (!chosen) return base;
  base.ruleId = chosen.rule.id;
  base.ruleName = chosen.rule.name;
  if (chosen.value === undefined) {
    base.decision = "skip";
    base.reason = "Resposta sem tradução, tipo, moeda ou período compatível.";
    return base;
  }
  if (base.decision !== "skip") base.value = chosen.value;
  return base;
}
export function isRuleField(value: unknown): value is RuleField {
  if (typeof value !== "object" || value === null) return false;
  const field = value as Record<string, unknown>;
  return (
    ["fieldId", "question", "controlType", "fingerprint"].every(
      (key) =>
        typeof field[key] === "string" && (field[key] as string).length <= 6000,
    ) &&
    ["pt-BR", "en"].includes(String(field.language)) &&
    ["text", "number", "email", "tel", "url", "date", "textarea"].includes(
      String(field.controlType),
    )
  );
}
