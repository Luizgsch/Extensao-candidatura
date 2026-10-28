export type FieldStatus =
  "filled" | "preserved" | "review" | "unknown" | "unsupported" | "failed";
export interface FieldOutcome {
  label: string;
  status: FieldStatus;
  reason: string;
  ruleName?: string;
  score?: number;
  suggestionId?: string;
  suggestionPreview?: string;
}
export interface FillReport {
  found: number;
  editable: number;
  recognized: number;
  filled: number;
  preserved: number;
  review: number;
  unknown: number;
  unsupported: number;
  failed: number;
  undoAvailable: boolean;
  dynamicChanges?: boolean;
  items: FieldOutcome[];
}
export interface UndoReport {
  restored: number;
  conflicts: number;
  failed: number;
}
export interface PageSession {
  report?: FillReport;
  undoAvailable: boolean;
}
export function isFillReport(value: unknown): value is FillReport {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    [
      "found",
      "editable",
      "recognized",
      "filled",
      "preserved",
      "review",
      "unknown",
      "unsupported",
      "failed",
    ].every(
      (k) =>
        typeof v[k] === "number" &&
        Number.isInteger(v[k]) &&
        (v[k] as number) >= 0,
    ) &&
    typeof v.undoAvailable === "boolean" &&
    Array.isArray(v.items) &&
    v.items.every(
      (item) =>
        item &&
        typeof item.label === "string" &&
        typeof item.reason === "string" &&
        [
          "filled",
          "preserved",
          "review",
          "unknown",
          "unsupported",
          "failed",
        ].includes(item.status),
    )
  );
}
