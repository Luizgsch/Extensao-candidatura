export interface PageAnalysis {
  url: string;
  title: string;
  fieldsFound: number;
  editableFields: number;
  manualUploads: number;
  embeddedFrames: number;
}
export type ExtensionMessage = {
  type:
    | "GET_STATUS"
    | "ANALYZE_ACTIVE_TAB"
    | "FILL_ACTIVE_TAB"
    | "UNDO_ACTIVE_TAB"
    | "GET_ACTIVE_SESSION";
};
export type AnalysisResponse =
  { ok: true; analysis: PageAnalysis } | { ok: false; error: string };
export function isExtensionMessage(value: unknown): value is ExtensionMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    [
      "GET_STATUS",
      "ANALYZE_ACTIVE_TAB",
      "FILL_ACTIVE_TAB",
      "UNDO_ACTIVE_TAB",
      "GET_ACTIVE_SESSION",
    ].includes(String(value.type))
  );
}
export function isPageAnalysis(value: unknown): value is PageAnalysis {
  if (typeof value !== "object" || value === null) return false;
  const data = value as Record<string, unknown>;
  return (
    typeof data.url === "string" &&
    typeof data.title === "string" &&
    ["fieldsFound", "editableFields", "manualUploads", "embeddedFrames"].every(
      (key) =>
        typeof data[key] === "number" &&
        Number.isInteger(data[key]) &&
        (data[key] as number) >= 0,
    )
  );
}
