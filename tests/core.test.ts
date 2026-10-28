import test from "node:test";
import assert from "node:assert/strict";
import { normalizeText, containsPhrase } from "../src/core/normalization";
import { decideMatch } from "../src/core/confidence";
import { createDefaultState } from "../src/defaults/state";
const settings = createDefaultState().settings.confidence;
test("preserva negação e distingue linguagens", () => {
  assert.equal(
    normalizeText(" NÃO possui experiência em JAVA? "),
    "nao possui experiencia em java",
  );
  assert.equal(normalizeText("C++ / C# / 2"), "c++ c# 2");
  assert.equal(containsPhrase("JavaScript experience", "Java"), false);
  assert.equal(containsPhrase("Experiência com Java?", "java"), true);
});
test("empate impede preenchimento de alta confiança", () => {
  assert.equal(
    decideMatch(
      "f",
      [
        { ruleId: "a", score: 98, suggestionOnly: false },
        { ruleId: "b", score: 96, suggestionOnly: false },
      ],
      settings,
    ).decision,
    "skip",
  );
});
test("limiares e respostas discursivas preservam revisão", () => {
  const decide = (score: number, suggestionOnly = false) =>
    decideMatch("f", [{ ruleId: "a", score, suggestionOnly }], settings)
      .decision;
  assert.equal(decide(90), "fill");
  assert.equal(decide(89), "suggest");
  assert.equal(decide(69), "skip");
  assert.equal(decide(100, true), "suggest");
  assert.equal(decideMatch("f", [], settings).decision, "skip");
});
test("estado vazio sem referências compartilhadas", () => {
  const state = createDefaultState();
  state.settings.confidence.minimumLead = 99;
  assert.equal(createDefaultState().settings.confidence.minimumLead, 10);
  assert.deepEqual(state.candidate, {});
});
import { isExtensionMessage, isPageAnalysis } from "../src/shared/messaging";
test("protocolo rejeita comandos desconhecidos e contagens inválidas", () => {
  assert.equal(isExtensionMessage({ type: "ANALYZE_ACTIVE_TAB" }), true);
  assert.equal(isExtensionMessage({ type: "SUBMIT_APPLICATION" }), false);
  assert.equal(isExtensionMessage(null), false);
  const analysis = {
    url: "https://example.test/jobs",
    title: "Vaga",
    fieldsFound: 3,
    editableFields: 2,
    manualUploads: 1,
    embeddedFrames: 0,
  };
  assert.equal(isPageAnalysis(analysis), true);
  assert.equal(isPageAnalysis({ ...analysis, fieldsFound: -1 }), false);
  assert.equal(isPageAnalysis({ ...analysis, editableFields: "2" }), false);
});
import { parseState } from "../src/storage/schema";
import {
  exportBackup,
  importBackup,
  MAX_IMPORT_BYTES,
} from "../src/storage/import-export";
test("backup completo preserva respostas tipadas e não inclui logs", () => {
  const state = createDefaultState();
  state.candidate.name = {
    type: "text",
    value: { "pt-BR": "Pessoa de teste" },
  };
  state.candidate.salary = {
    type: "salary",
    value: 2000,
    currency: "BRL",
    period: "month",
  };
  state.logs = [
    {
      id: "log-1",
      at: "2026-10-28T12:00:00Z",
      fieldId: "f",
      score: 95,
      action: "filled",
    },
  ];
  const restored = importBackup(exportBackup(state, true));
  assert.deepEqual(restored.candidate, state.candidate);
  assert.deepEqual(restored.logs, []);
});
test("backup de preferências não vaza dados, respostas ou experiências", () => {
  const state = createDefaultState();
  state.candidate.email = { type: "email", value: "teste@example.test" };
  state.settings.confidence.automaticMinimum = 95;
  const exported = exportBackup(state, false);
  const restored = importBackup(exported);
  assert.equal(exported.includes("teste@example.test"), false);
  assert.deepEqual(restored.candidate, {});
  assert.equal(restored.settings.confidence.automaticMinimum, 95);
});
test("importação recusa JSON inválido, versão desconhecida, escopo inválido e arquivo grande", () => {
  assert.throws(() => importBackup("{"), /JSON/);
  const envelope = JSON.parse(exportBackup(createDefaultState(), true));
  assert.throws(
    () => importBackup(JSON.stringify({ ...envelope, version: 99 })),
    /incompatível/,
  );
  assert.throws(
    () => importBackup(JSON.stringify({ ...envelope, scope: "other" })),
    /incompatível/,
  );
  assert.throws(() => importBackup(" ".repeat(MAX_IMPORT_BYTES + 1)), /5 MB/);
});
test("validação rejeita dados incompatíveis, datas impossíveis e referência ausente", () => {
  const state = createDefaultState();
  assert.throws(() => parseState({ ...state, schemaVersion: 2 }), /inválidos/);
  assert.throws(
    () =>
      parseState({
        ...state,
        candidate: { date: { type: "date", value: "2026-02-30" } },
      }),
    /inválidos/,
  );
  assert.throws(
    () =>
      parseState({
        ...state,
        candidate: { email: { type: "email", value: "errado" } },
      }),
    /inválidos/,
  );
  assert.throws(
    () =>
      parseState({
        ...state,
        candidate: { url: { type: "url", value: "javascript:alert(1)" } },
      }),
    /inválidos/,
  );
  assert.throws(
    () =>
      parseState({
        ...state,
        profiles: [
          {
            id: "p",
            name: "Teste",
            technologies: [],
            introduction: {},
            experienceIds: ["ausente"],
            answerOverrides: {},
          },
        ],
      }),
    /referências/,
  );
});
test("validação bloqueia chaves perigosas, segredos e conflitos de confiança", () => {
  const state = createDefaultState();
  assert.throws(
    () =>
      parseState(
        JSON.parse(
          JSON.stringify(state).replace(
            '"candidate":{}',
            '"candidate":{"__proto__":{}}',
          ),
        ),
      ),
    /chave/,
  );
  assert.throws(
    () =>
      parseState({
        ...state,
        candidate: { password: { type: "text", value: { en: "secret" } } },
      }),
    /permitidos/,
  );
  assert.throws(
    () =>
      parseState({
        ...state,
        settings: {
          ...state.settings,
          confidence: { ...state.settings.confidence, highlightedMinimum: 99 },
        },
      }),
    /inválidos/,
  );
});
test("todos os tipos de resposta e idiomas sobrevivem à validação", () => {
  const state = createDefaultState();
  state.candidate = {
    text: { type: "text", value: { "pt-BR": "Olá", en: "Hello" } },
    long: { type: "long-text", value: { en: "Story" } },
    n: { type: "number", value: 2 },
    years: { type: "experience-years", value: 1.5 },
    bool: { type: "boolean", value: false },
    one: { type: "single-choice", value: "Sim" },
    many: { type: "multiple-choice", value: ["Java", "SQL"] },
    url: { type: "url", value: "https://example.test" },
    email: { type: "email", value: "a@example.test" },
    phone: { type: "phone", value: "41999999999" },
    date: { type: "date", value: "2000-02-29" },
    salary: { type: "salary", value: 2000.5, currency: "BRL", period: "month" },
  };
  assert.deepEqual(parseState(state), state);
});
import { editAnswer } from "../src/storage/answers";
test("edição preserva tipo, idioma, moeda e período importados", () => {
  assert.deepEqual(
    editAnswer(
      { type: "salary", value: 2000, currency: "USD", period: "year" },
      "2500",
      "salary",
    ),
    { type: "salary", value: 2500, currency: "USD", period: "year" },
  );
  assert.deepEqual(
    editAnswer(
      { type: "text", value: { "pt-BR": "Olá", en: "Hello" } },
      "Oi",
      "text",
    ),
    { type: "text", value: { "pt-BR": "Oi", en: "Hello" } },
  );
  assert.deepEqual(
    editAnswer({ type: "single-choice", value: "A" }, "B", "text"),
    { type: "single-choice", value: "B" },
  );
  assert.deepEqual(
    editAnswer({ type: "multiple-choice", value: ["A"] }, "B, C", "text"),
    { type: "multiple-choice", value: ["B", "C"] },
  );
});
test("backup próximo do limite de armazenamento continua importável", () => {
  const state = createDefaultState();
  for (let i = 0; i < 85; i++)
    state.candidate["campo" + i] = {
      type: "text",
      value: { "pt-BR": "a".repeat(49270) },
    };
  assert.ok(
    new TextEncoder().encode(JSON.stringify(state)).length < 4 * 1024 * 1024,
  );
  assert.deepEqual(importBackup(exportBackup(state, true)), state);
});
import {
  matchPersonalField,
  valueForPersonalField,
  type PersonalSignals,
} from "../src/core/matching/personal-fields";
const signals = (
  label: string,
  extra: Partial<PersonalSignals> = {},
): PersonalSignals => ({
  label,
  name: "",
  id: "",
  placeholder: "",
  autocomplete: "",
  ...extra,
});
test("MVP reconhece rótulos PT/EN e camelCase sem confundir tipos de pergunta", () => {
  assert.equal(matchPersonalField(signals("Nome completo *")).key, "fullName");
  assert.equal(matchPersonalField(signals("First name")).key, "firstName");
  assert.equal(matchPersonalField(signals("GitHub")).key, "github");
  assert.equal(matchPersonalField(signals("LinkedIn")).key, "linkedin");
  assert.equal(
    matchPersonalField(signals("Confirmação de e-mail")).key,
    "email",
  );
  assert.equal(
    matchPersonalField(signals("", { name: "lastName" })).key,
    "lastName",
  );
  assert.equal(
    matchPersonalField(signals("Quantos anos de experiência com Java?")).key,
    undefined,
  );
  assert.equal(
    matchPersonalField(signals("Possui experiência com Java?")).key,
    undefined,
  );
});
test("MVP recusa ambiguidades, terceiros e autenticação", () => {
  assert.equal(
    matchPersonalField(signals("Nome completo", { id: "email" })).ambiguous,
    true,
  );
  assert.equal(
    matchPersonalField(signals("E-mail do responsável", { name: "email" })).key,
    undefined,
  );
  assert.equal(
    matchPersonalField(signals("Email", { autocomplete: "one-time-code" })).key,
    undefined,
  );
  assert.equal(
    matchPersonalField(signals("Nome da empresa", { id: "name" })).key,
    undefined,
  );
});
test("MVP respeita idioma, tipo e respostas discursivas", () => {
  assert.equal(
    valueForPersonalField(
      "firstName",
      { type: "text", value: { "pt-BR": "Pessoa" } },
      "text",
      "en",
    ),
    "Pessoa",
  );
  assert.equal(
    valueForPersonalField(
      "englishLevel",
      { type: "text", value: { "pt-BR": "Intermediário" } },
      "text",
      "en",
    ),
    undefined,
  );
  assert.equal(
    valueForPersonalField(
      "email",
      { type: "text", value: { "pt-BR": "nome" } },
      "email",
      "pt-BR",
    ),
    undefined,
  );
  assert.equal(
    valueForPersonalField(
      "fullName",
      { type: "url", value: "https://example.test" },
      "text",
      "pt-BR",
    ),
    undefined,
  );
  assert.equal(
    valueForPersonalField(
      "fullName",
      { type: "long-text", value: { "pt-BR": "História" } },
      "text",
      "pt-BR",
    ),
    undefined,
  );
  assert.equal(
    valueForPersonalField(
      "birthDate",
      { type: "date", value: "2000-01-01" },
      "text",
      "pt-BR",
    ),
    undefined,
  );
});
test("subcampos de telefone e autofill financeiro ficam para revisão", () => {
  for (const autocomplete of [
    "tel-national",
    "tel-area-code",
    "tel-local",
    "tel-country-code",
    "tel-extension",
    "cc-name",
    "organization",
  ])
    assert.equal(
      matchPersonalField(signals("Nome", { autocomplete })).key,
      undefined,
    );
  assert.equal(
    matchPersonalField(signals("Telefone", { autocomplete: "tel-national" }))
      .key,
    undefined,
  );
});
import { resolveRule, type RuleField } from "../src/core/matching/rules";
import type { AnswerRule, AnswerValue } from "../src/shared/types";
const rule = (
  id: string,
  answer: AnswerValue,
  keywords = ["java", "experiencia java"],
): AnswerRule => ({
  id,
  name: id,
  subject: "Java",
  category: "Experiência",
  keywords,
  excludedKeywords: [],
  answer,
  enabled: true,
  priority: 0,
  insertion: "automatic",
});
const ruleField = (
  question: string,
  controlType = "text",
  language: "pt-BR" | "en" = "pt-BR",
): RuleField => ({
  fieldId: "field-1",
  question,
  controlType,
  language,
  fingerprint: "test",
});
test("regras distinguem existência de duração em PT/EN", () => {
  const state = createDefaultState();
  state.rules = [
    rule("bool", { type: "boolean", value: true }),
    rule("years", { type: "experience-years", value: 2 }),
  ];
  for (const question of [
    "Você possui experiência com Java?",
    "Tem conhecimento em Java?",
  ]) {
    const result = resolveRule(ruleField(question), state, {
      domain: "example.test",
    });
    assert.equal(result.ruleId, "bool");
    assert.equal(result.value, "Sim");
    assert.equal(result.decision, "fill");
  }
  for (const question of [
    "Quantos anos de experiência com Java?",
    "Há quanto tempo trabalha com Java?",
  ]) {
    const result = resolveRule(ruleField(question), state, {
      domain: "example.test",
    });
    assert.equal(result.ruleId, "years");
    assert.equal(result.value, "2");
    assert.equal(result.decision, "fill");
  }
  assert.equal(
    resolveRule(
      ruleField("Do you have experience with Java?", "text", "en"),
      state,
      { domain: "example.test" },
    ).value,
    "Yes",
  );
  assert.equal(
    resolveRule(
      ruleField("How many years of experience with Java?", "number", "en"),
      state,
      { domain: "example.test" },
    ).value,
    "2",
  );
});
test("regras recusam negação, requisitos numéricos, tecnologias extras e assuntos diferentes", () => {
  const state = createDefaultState();
  state.rules = [rule("bool", { type: "boolean", value: true })];
  for (const question of [
    "Não possui experiência com Java?",
    "Do you have no experience with Java?",
    "Possui pelo menos 5 anos de experiência com Java?",
    "Possui experiência com Java e Python?",
    "Possui certificação em Java?",
    "Possui experiência com JavaScript?",
  ])
    assert.equal(
      resolveRule(
        ruleField(question, "text", question.startsWith("Do") ? "en" : "pt-BR"),
        state,
        { domain: "example.test" },
      ).decision,
      "skip",
      question,
    );
});
test("prioridade não mascara empate e regras desativadas são ignoradas", () => {
  const state = createDefaultState();
  state.rules = [
    rule("a", { type: "boolean", value: true }),
    { ...rule("b", { type: "boolean", value: false }), priority: 100 },
  ];
  assert.equal(
    resolveRule(ruleField("Possui experiência com Java?"), state, {
      domain: "example.test",
    }).decision,
    "skip",
  );
  state.rules[0]!.enabled = false;
  assert.equal(
    resolveRule(ruleField("Possui experiência com Java?"), state, {
      domain: "example.test",
    }).ruleId,
    "b",
  );
});
test("sinônimos configurados conectam variações e exclusões impedem resposta", () => {
  const state = createDefaultState();
  state.synonyms = {
    "pt-BR": { relocation: ["mudança", "mudar de cidade"] },
    en: { relocation: ["relocate", "relocation"] },
  };
  state.rules = [
    {
      ...rule("move", { type: "boolean", value: true }, ["mudança"]),
      subject: "mudança",
    },
  ];
  assert.equal(
    resolveRule(ruleField("Você aceita mudar de cidade?"), state, {
      domain: "example.test",
    }).value,
    "Sim",
  );
  assert.equal(
    resolveRule(
      ruleField("Are you willing to relocate?", "text", "en"),
      state,
      { domain: "example.test" },
    ).value,
    "Yes",
  );
  state.rules[0]!.excludedKeywords = ["cidade"];
  assert.equal(
    resolveRule(ruleField("Você aceita mudar de cidade?"), state, {
      domain: "example.test",
    }).decision,
    "skip",
  );
});
test("escopo de domínio/perfil, confiança intermediária e idioma são respeitados", () => {
  const state = createDefaultState();
  state.rules = [
    {
      ...rule("a", { type: "boolean", value: true }),
      domains: ["example.test"],
      profileIds: ["backend"],
    },
  ];
  assert.equal(
    resolveRule(ruleField("Possui experiência com Java?"), state, {
      domain: "other.test",
      profileId: "backend",
    }).decision,
    "skip",
  );
  assert.equal(
    resolveRule(ruleField("Possui experiência com Java?"), state, {
      domain: "example.test",
    }).decision,
    "skip",
  );
  state.settings.confidence.automaticMinimum = 99;
  assert.equal(
    resolveRule(ruleField("Possui experiência com Java?"), state, {
      domain: "example.test",
      profileId: "backend",
    }).decision,
    "suggest",
  );
  state.settings.confidence.fillMediumConfidence = true;
  assert.equal(
    resolveRule(ruleField("Possui experiência com Java?"), state, {
      domain: "example.test",
      profileId: "backend",
    }).decision,
    "fill-highlighted",
  );
});
test("respostas discursivas são sugestões, mesmo com correspondência exata", () => {
  const state = createDefaultState();
  state.rules = [
    {
      ...rule(
        "story",
        { type: "long-text", value: { "pt-BR": "História salva." } },
        ["Conte sobre sua experiência com Java"],
      ),
      insertion: "suggestion",
    },
  ];
  const result = resolveRule(
    ruleField("Conte sobre sua experiência com Java", "textarea"),
    state,
    { domain: "example.test" },
  );
  assert.equal(result.decision, "suggest");
  assert.equal(result.value, "História salva.");
});
test("perguntas discursivas genéricas podem usar mapeamento explícito, sempre como sugestão", () => {
  const state = createDefaultState();
  state.rules = [
    {
      ...rule(
        "about",
        { type: "long-text", value: { "pt-BR": "Apresentação salva." } },
        ["Conte sobre você"],
      ),
      subject: "Apresentação",
      insertion: "suggestion",
    },
  ];
  const result = resolveRule(ruleField("Conte sobre você", "textarea"), state, {
    domain: "example.test",
  });
  assert.equal(result.decision, "suggest");
  assert.equal(result.value, "Apresentação salva.");
});
test("salário não troca moeda ou período e qualificação profissional não é inferida", () => {
  const state = createDefaultState();
  state.rules = [
    {
      ...rule(
        "salary",
        { type: "salary", value: 2000, currency: "BRL", period: "month" },
        ["Qual sua pretensão salarial anual USD?"],
      ),
      subject: "pretensão salarial",
    },
  ];
  const salary = resolveRule(
    ruleField("Qual sua pretensão salarial anual USD?", "number"),
    state,
    { domain: "example.test" },
  );
  assert.equal(salary.decision, "skip");
  assert.match(salary.reason, /moeda|período/);
  state.rules = [rule("bool", { type: "boolean", value: true })];
  assert.equal(
    resolveRule(ruleField("Possui experiência profissional com Java?"), state, {
      domain: "example.test",
    }).decision,
    "skip",
  );
});
test("experiência não implica disponibilidade, autorização ou certificação", () => {
  const state = createDefaultState();
  state.rules = [rule("experience", { type: "boolean", value: true })];
  for (const question of [
    "Aceita trabalhar com Java?",
    "Are you willing to work with Java?",
    "Possui autorização para trabalhar com Java?",
    "Possui certificação Java?",
  ])
    assert.equal(
      resolveRule(
        ruleField(
          question,
          "text",
          question.startsWith("Are") ? "en" : "pt-BR",
        ),
        state,
        { domain: "example.test" },
      ).decision,
      "skip",
      question,
    );
});
