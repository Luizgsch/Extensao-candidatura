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
