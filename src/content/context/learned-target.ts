import type { FieldMapping } from "../../shared/types";
function text(element: Element | undefined | null): string {
  if (!element) return "";
  const copy = element.cloneNode(true) as Element;
  copy
    .querySelectorAll(
      "input,select,textarea,button,output,script,style,[role=combobox],[role=listbox],[role=option],[role=radio],[role=checkbox]",
    )
    .forEach((node) => node.remove());
  return copy.textContent?.trim().slice(0, 2000) ?? "";
}
export function learnedFingerprint(
  element: HTMLElement,
  controlType: string,
  labelOverride?: string,
): FieldMapping["fingerprint"] {
  const labelled = element
    .getAttribute("aria-labelledby")
    ?.split(/\s+/)
    .map((id) => text(document.getElementById(id)))
    .join(" ");
  const native =
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement;
  let label =
    labelOverride ??
    labelled ??
    element.getAttribute("aria-label") ??
    (native ? [...(element.labels ?? [])].map(text).join(" ") : "");
  if (!label.trim() && native)
    label = element instanceof HTMLSelectElement ? "" : element.placeholder;
  if (
    !label.trim() &&
    element.parentElement?.querySelectorAll(
      "input,textarea,select,[role=combobox],[role=checkbox],[role=radio]",
    ).length === 1
  )
    label = text(element.parentElement);
  const fieldset = element.closest("fieldset"),
    section = element.closest("section,[role=group],[role=radiogroup]");
  const heading =
    text(fieldset?.querySelector("legend")) ||
    section?.getAttribute("aria-label") ||
    text(section?.querySelector("h1,h2,h3,h4"));
  return {
    label: label.trim().slice(0, 2000),
    name: (element.getAttribute("name") ?? "").slice(0, 500),
    id: element.id.slice(0, 500),
    section: heading.slice(0, 2000),
    controlType,
  };
}
