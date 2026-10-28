import { isVisible } from "./visibility";
export type NativeTextControl = HTMLInputElement | HTMLTextAreaElement;
export function isSimpleControl(
  element: Element,
): element is NativeTextControl {
  if (
    element.getAttribute("role") === "combobox" ||
    element.getAttribute("aria-haspopup") === "listbox"
  )
    return false;
  return (
    element instanceof HTMLTextAreaElement ||
    (element instanceof HTMLInputElement &&
      ["text", "email", "tel", "url", "number", "date"].includes(element.type))
  );
}
export function canWrite(element: NativeTextControl): boolean {
  return (
    isSimpleControl(element) &&
    isVisible(element) &&
    !element.closest(
      '[hidden],[aria-hidden="true"],[aria-disabled="true"],[aria-readonly="true"]',
    ) &&
    window.getComputedStyle(element).visibility !== "hidden" &&
    !element.matches(":disabled") &&
    !element.readOnly &&
    element.getAttribute("aria-disabled") !== "true" &&
    !element.closest("[inert]")
  );
}
export function setNativeValue(
  element: NativeTextControl,
  value: string,
): void {
  const setter = Object.getOwnPropertyDescriptor(
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype,
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
