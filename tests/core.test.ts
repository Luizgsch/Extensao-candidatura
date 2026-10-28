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
