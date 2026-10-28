export interface PageAnalysis {
  url: string;
  title: string;
  fieldsFound: number;
  editableFields: number;
  manualUploads: number;
  embeddedFrames: number;
}
export type ExtensionMessage =
  { type: "GET_STATUS" } | { type: "ANALYZE_ACTIVE_TAB" };
export type AnalysisResponse =
  { ok: true; analysis: PageAnalysis } | { ok: false; error: string };
export function isExtensionMessage(value: unknown): value is ExtensionMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    (value.type === "GET_STATUS" || value.type === "ANALYZE_ACTIVE_TAB")
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
