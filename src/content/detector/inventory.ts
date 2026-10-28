import type { PageAnalysis } from "../../shared/messaging";
export function visibleNativeControls(
  document: Document,
): (HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement)[] {
  return [
    ...document.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >("input, select, textarea"),
  ].filter((element) => {
    if (
      ["hidden", "password", "submit", "button", "reset", "image"].includes(
        element.type,
      )
    )
      return false;
    if (element.closest('[hidden],[inert],[aria-hidden="true"]')) return false;
    const style = document.defaultView?.getComputedStyle(element);
    return (
      style?.visibility !== "hidden" &&
      style?.display !== "none" &&
      element.getClientRects().length > 0
    );
  });
}
export function inspectPage(document: Document): PageAnalysis {
  const visible = visibleNativeControls(document);
  return {
    url: document.location.origin + document.location.pathname,
    title: document.title.slice(0, 200),
    fieldsFound: visible.length,
    editableFields: visible.filter(
      (e) =>
        !e.matches(":disabled") &&
        !("readOnly" in e && e.readOnly) &&
        e.type !== "file",
    ).length,
    manualUploads: visible.filter((e) => e.type === "file").length,
    embeddedFrames: document.querySelectorAll("iframe,frame").length,
  };
}
