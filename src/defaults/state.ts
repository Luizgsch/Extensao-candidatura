import type { AppState } from "../shared/types";
export function createDefaultState(): AppState {
  return {
    schemaVersion: 1,
    candidate: {},
    education: [],
    experiences: [],
    profiles: [],
    rules: [],
    mappings: [],
    synonyms: { "pt-BR": {}, en: {} },
    logs: [],
    settings: {
      language: "pt-BR",
      preserveExisting: true,
      confidence: {
        automaticMinimum: 90,
        highlightedMinimum: 70,
        minimumLead: 10,
        fillMediumConfidence: false,
      },
    },
  };
}
