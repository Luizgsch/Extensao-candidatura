import type { ConfidenceSettings, MatchResult } from "../../shared/types";
export interface ScoredCandidate {
  ruleId: string;
  score: number;
  suggestionOnly: boolean;
  priority?: number;
}
export function decideMatch(
  fieldId: string,
  candidates: ScoredCandidate[],
  settings: ConfidenceSettings,
): MatchResult {
  const ranked = [...candidates].sort(
    (a, b) => b.score - a.score || (b.priority ?? 0) - (a.priority ?? 0),
  );
  const best = ranked[0];
  const next = ranked[1];
  if (!best)
    return {
      fieldId,
      score: 0,
      decision: "skip",
      reasons: ["Nenhuma correspondência."],
    };
  const result: MatchResult = {
    fieldId,
    ruleId: best.ruleId,
    score: best.score,
    decision: "skip",
    reasons: [],
    ...(next ? { runnerUpScore: next.score } : {}),
  };
  if (next && best.score - next.score < settings.minimumLead) {
    result.reasons.push("Correspondências ambíguas.");
    return result;
  }
  if (best.score < settings.highlightedMinimum) {
    result.reasons.push("Confiança insuficiente.");
    return result;
  }
  result.decision = best.suggestionOnly
    ? "suggest"
    : best.score >= settings.automaticMinimum
      ? "fill"
      : settings.fillMediumConfidence
        ? "fill-highlighted"
        : "suggest";
  return result;
}
