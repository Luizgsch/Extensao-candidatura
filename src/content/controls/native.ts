export type NativeTextControl = HTMLInputElement;
export function canWrite(element: HTMLInputElement): boolean {
  return (
    element.isConnected &&
    !element.matches(":disabled") &&
    !element.readOnly &&
    element.getAttribute("aria-disabled") !== "true" &&
    !element.closest("[inert]")
  );
}
export function setNativeValue(element: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  if (!setter) throw new Error("Controle sem setter nativo.");
  setter.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
  element.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
}
export function highlight(element: Element, status: "filled" | "review"): void {
  element.animate(
    [
      {
        outline: "2px solid " + (status === "filled" ? "#3e7044" : "#a46125"),
        outlineOffset: "3px",
      },
      {
        outline: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "2px solid " + (status === "filled" ? "#3e7044" : "#a46125")
          : "2px solid transparent",
        outlineOffset: "3px",
      },
    ],
    { duration: 1800 },
  );
}
