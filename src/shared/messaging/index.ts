export type ExtensionMessage = { type: "GET_STATUS" };
export function isExtensionMessage(value: unknown): value is ExtensionMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "GET_STATUS"
  );
}
