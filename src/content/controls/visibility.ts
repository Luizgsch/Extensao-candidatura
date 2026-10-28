export function isVisible(element: Element): boolean {
  if (
    !element.isConnected ||
    element.getClientRects().length === 0 ||
    element.closest('[hidden],[inert],[aria-hidden="true"]')
  )
    return false;
  const view = element.ownerDocument.defaultView;
  if (!view) return false;
  for (let node: Element | null = element; node; node = node.parentElement) {
    const style = view.getComputedStyle(node);
    if (
      Number(style.opacity) === 0 ||
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.visibility === "collapse"
    )
      return false;
  }
  return true;
}
