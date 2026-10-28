import type { PageAnalysis } from "../../shared/messaging";
// Diagnostic inventory only. No candidate values or answers are read here.
export function inspectPage(document: Document): PageAnalysis {
  const controls = [
    ...document.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >("input, select, textarea"),
  ];
  const visible = controls.filter((element) => {
    if (
      ["hidden", "password", "submit", "button", "reset", "image"].includes(
        element.type,
      )
    )
      return false;
    if (element.closest('[hidden], [inert], [aria-hidden="true"]'))
      return false;
    const style = document.defaultView?.getComputedStyle(element);
    return (
      style?.visibility !== "hidden" &&
      style?.display !== "none" &&
      element.getClientRects().length > 0
    );
  });
  return {
    url: document.location.origin + document.location.pathname,
    title: document.title.slice(0, 200),
    fieldsFound: visible.length,
    editableFields: visible.filter(
      (element) =>
        !element.matches(":disabled") &&
        !("readOnly" in element && element.readOnly) &&
        element.type !== "file",
    ).length,
    manualUploads: visible.filter((element) => element.type === "file").length,
    embeddedFrames: document.querySelectorAll("iframe, frame").length,
  };
}
