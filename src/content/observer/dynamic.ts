let observer: MutationObserver | undefined,
  timer: ReturnType<typeof setTimeout> | undefined,
  changed = false;
const selector =
  "input,select,textarea,[role=combobox],[role=checkbox],[role=radio]";
export function watchDynamicFields() {
  observer?.disconnect();
  if (timer) clearTimeout(timer);
  changed = false;
  const forms = [...document.querySelectorAll("form,[role=form]")]
    .filter(
      (element, index, list) =>
        !list.some((parent, j) => j !== index && parent.contains(element)),
    )
    .slice(0, 5);
  observer = new MutationObserver((records) => {
    const relevant = records
      .slice(0, 100)
      .some(
        (record) =>
          (record.target instanceof Element &&
            !!record.target.closest("select")) ||
          [...record.addedNodes, ...record.removedNodes].some(
            (node) =>
              node instanceof Element &&
              (node.matches(selector) || !!node.querySelector(selector)),
          ),
      );
    if (relevant) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        changed = true;
      }, 200);
    }
  });
  for (const root of forms.length ? forms : [document.body])
    if (root) observer.observe(root, { childList: true, subtree: true });
}
export function hasDynamicChanges() {
  return changed;
}
window.addEventListener("pagehide", () => {
  observer?.disconnect();
  if (timer) clearTimeout(timer);
});
