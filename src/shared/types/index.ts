export type Language = "pt-BR" | "en";
export type LocalizedText = Partial<Record<Language, string>>;
export type AnswerValue =
  | { type: "text" | "long-text"; value: LocalizedText }
  | { type: "number" | "experience-years"; value: number }
  | { type: "boolean"; value: boolean }
  | {
      type: "single-choice" | "url" | "email" | "phone" | "date";
      value: string;
    }
  | { type: "multiple-choice"; value: string[] }
  | {
      type: "salary";
      value: number;
      currency: string;
      period: "hour" | "month" | "year";
    };
export type AnswerType = AnswerValue["type"];
export interface AnswerRule {
  id: string;
  name: string;
  category: string;
  subject: string;
  keywords: string[];
  excludedKeywords: string[];
  answer: AnswerValue;
  enabled: boolean;
  priority: number;
  insertion: "automatic" | "suggestion";
  profileIds?: string[];
  domains?: string[];
}
export interface Experience {
  id: string;
  organization: string;
  role: string;
  startMonth: string;
  endMonth?: string;
  current: boolean;
  shortDescription: LocalizedText;
  fullDescription: LocalizedText;
  activities: LocalizedText[];
}
export interface Education {
  id: string;
  institution: string;
  course: string;
  startYear: number;
  endYear?: number;
  semester?: number;
  modality?: string;
  shift?: string;
}
export interface CandidateProfile {
  id: string;
  name: string;
  preferredResumeName?: string;
  technologies: string[];
  introduction: LocalizedText;
  experienceIds: string[];
  answerOverrides: Record<string, AnswerValue>;
}
export interface ConfidenceSettings {
  automaticMinimum: number;
  highlightedMinimum: number;
  minimumLead: number;
  fillMediumConfidence: boolean;
}
export interface FieldDescriptor {
  id: string;
  frameId: number;
  controlType: string;
  label: string;
  nearbyText: string;
  section: string;
  language?: Language;
  expectedType?: AnswerType;
  options: { id: string; label: string; value: string }[];
  required: boolean;
  empty: boolean;
  visible: boolean;
  editable: boolean;
}
export interface FieldMapping {
  allowConsent?: boolean;
  id: string;
  domain: string;
  pathPattern?: string;
  fingerprint: {
    label?: string;
    name?: string;
    id?: string;
    section?: string;
    controlType: string;
  };
  ruleId: string;
  enabled: boolean;
}
export interface MatchResult {
  fieldId: string;
  ruleId?: string;
  score: number;
  runnerUpScore?: number;
  reasons: string[];
  decision: "fill" | "fill-highlighted" | "suggest" | "skip";
}
export interface FillResult {
  fieldId: string;
  status: "filled" | "suggested" | "skipped" | "failed" | "needs-review";
  reason?: string;
}
export interface LocalLog {
  id: string;
  at: string;
  fieldId: string;
  ruleId?: string;
  score: number;
  action: FillResult["status"];
}
export interface AppState {
  schemaVersion: 1;
  candidate: Record<string, AnswerValue>;
  education: Education[];
  experiences: Experience[];
  profiles: CandidateProfile[];
  rules: AnswerRule[];
  mappings: FieldMapping[];
  synonyms: Record<Language, Record<string, string[]>>;
  settings: {
    confidence: ConfidenceSettings;
    preserveExisting: boolean;
    language: Language;
  };
  logs: LocalLog[];
}
