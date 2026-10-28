import { z } from "zod";
import type { AppState } from "../shared/types";
const text = z.string().max(50000);
const id = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-zA-Z0-9_-]+$/);
const localized = z
  .object({ "pt-BR": text.optional(), en: text.optional() })
  .strict();
const number = z.number().finite().nonnegative();
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const d = new Date(value + "T00:00:00Z");
    return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === value;
  }, "Data inválida");
const url = z
  .string()
  .max(4000)
  .url()
  .refine(
    (value) => ["http:", "https:"].includes(new URL(value).protocol),
    "Use URL HTTP ou HTTPS",
  );
export const answerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), value: localized }).strict(),
  z.object({ type: z.literal("long-text"), value: localized }).strict(),
  z.object({ type: z.literal("number"), value: number }).strict(),
  z
    .object({ type: z.literal("experience-years"), value: number.max(100) })
    .strict(),
  z.object({ type: z.literal("boolean"), value: z.boolean() }).strict(),
  z.object({ type: z.literal("single-choice"), value: text }).strict(),
  z
    .object({
      type: z.literal("multiple-choice"),
      value: z.array(text).max(500),
    })
    .strict(),
  z.object({ type: z.literal("url"), value: url }).strict(),
  z.object({ type: z.literal("email"), value: z.email().max(320) }).strict(),
  z
    .object({ type: z.literal("phone"), value: z.string().min(3).max(80) })
    .strict(),
  z.object({ type: z.literal("date"), value: date }).strict(),
  z
    .object({
      type: z.literal("salary"),
      value: number,
      currency: z.string().regex(/^[A-Z]{3}$/),
      period: z.enum(["hour", "month", "year"]),
    })
    .strict(),
]);
const strings = z.array(z.string().max(1000)).max(500);
const experience = z
  .object({
    id,
    organization: text,
    role: text,
    startMonth: month,
    endMonth: month.optional(),
    current: z.boolean(),
    shortDescription: localized,
    fullDescription: localized,
    activities: z.array(localized).max(500),
  })
  .strict()
  .refine(
    (e) =>
      e.current ? !e.endMonth : !!e.endMonth && e.endMonth >= e.startMonth,
    "Confira as datas da experiência",
  );
const education = z
  .object({
    id,
    institution: text,
    course: text,
    startYear: z.number().int().min(1900).max(2200),
    endYear: z.number().int().min(1900).max(2200).optional(),
    semester: z.number().int().min(1).max(30).optional(),
    modality: text.optional(),
    shift: text.optional(),
  })
  .strict()
  .refine(
    (e) => !e.endYear || e.endYear >= e.startYear,
    "Conclusão anterior ao início",
  );
const confidence = z
  .object({
    automaticMinimum: number.max(100),
    highlightedMinimum: number.max(100),
    minimumLead: z.number().finite().min(1).max(100),
    fillMediumConfidence: z.boolean(),
  })
  .strict()
  .refine(
    (c) => c.highlightedMinimum <= c.automaticMinimum,
    "Limiares inválidos",
  );
const rule = z
  .object({
    id,
    name: text,
    category: text,
    subject: text,
    keywords: strings,
    excludedKeywords: strings,
    answer: answerSchema,
    enabled: z.boolean(),
    priority: z.number().finite(),
    insertion: z.enum(["automatic", "suggestion"]),
    profileIds: z.array(id).max(100).optional(),
    domains: strings.optional(),
  })
  .strict()
  .refine(
    (rule) =>
      rule.answer.type !== "long-text" || rule.insertion === "suggestion",
    "Respostas longas precisam de inserção por sugestão",
  );
const profile = z
  .object({
    id,
    name: text,
    preferredResumeName: text.optional(),
    technologies: strings,
    introduction: localized,
    experienceIds: z.array(id).max(500),
    answerOverrides: z.record(id, answerSchema),
  })
  .strict();
const mapping = z
  .object({
    allowConsent: z.boolean().optional(),
    id,
    domain: text,
    pathPattern: text.optional(),
    fingerprint: z
      .object({
        label: text.optional(),
        name: text.optional(),
        id: text.optional(),
        section: text.optional(),
        controlType: text,
      })
      .strict(),
    ruleId: id,
    enabled: z.boolean(),
  })
  .strict();
const synonyms = z.record(z.string().max(1000), strings);
const schema = z
  .object({
    schemaVersion: z.literal(1),
    candidate: z.record(z.string().max(120), answerSchema),
    education: z.array(education).max(100),
    experiences: z.array(experience).max(500),
    profiles: z.array(profile).max(100),
    rules: z.array(rule).max(2000),
    mappings: z.array(mapping).max(2000),
    synonyms: z.object({ "pt-BR": synonyms, en: synonyms }).strict(),
    settings: z
      .object({
        confidence,
        preserveExisting: z.boolean(),
        language: z.enum(["pt-BR", "en"]),
      })
      .strict(),
    logs: z
      .array(
        z
          .object({
            id,
            at: z.iso.datetime(),
            fieldId: text,
            ruleId: id.optional(),
            score: number.max(100),
            action: z.enum([
              "filled",
              "suggested",
              "skipped",
              "failed",
              "needs-review",
            ]),
          })
          .strict(),
      )
      .max(1000),
  })
  .strict();
function rejectUnsafeKeys(value: unknown, depth = 0): void {
  if (depth > 30) throw new Error("Estrutura de dados muito profunda.");
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (["__proto__", "prototype", "constructor"].includes(key))
      throw new Error("Arquivo contém chave não permitida.");
    rejectUnsafeKeys(child, depth + 1);
  }
}
export function parseState(value: unknown): AppState {
  rejectUnsafeKeys(value);
  const result = schema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(
      "Dados inválidos em " +
        (issue?.path.join(".") || "configurações") +
        ". Confira tipos, datas e limites.",
    );
  }
  const data = result.data;
  for (const list of [
    data.education,
    data.experiences,
    data.profiles,
    data.rules,
    data.mappings,
    data.logs,
  ]) {
    if (new Set(list.map((item) => item.id)).size !== list.length)
      throw new Error("Existem identificadores duplicados.");
  }
  const profiles = new Set(data.profiles.map((p) => p.id)),
    experiences = new Set(data.experiences.map((e) => e.id)),
    rules = new Set(data.rules.map((r) => r.id));
  if (
    data.profiles.some(
      (p) =>
        p.experienceIds.some((id) => !experiences.has(id)) ||
        Object.keys(p.answerOverrides).some((id) => !rules.has(id)),
    ) ||
    data.rules.some((r) => r.profileIds?.some((id) => !profiles.has(id))) ||
    data.mappings.some((m) => !rules.has(m.ruleId))
  )
    throw new Error("Há referências a registros inexistentes.");
  const forbidden =
    /password|senha|token|otp|bankaccount|contabancaria|authcode|authenticationcode/i;
  if (Object.keys(data.candidate).some((key) => forbidden.test(key)))
    throw new Error(
      "Senhas, tokens, códigos e dados bancários não são permitidos.",
    );
  return data as AppState;
}
