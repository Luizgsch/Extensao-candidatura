export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}+#]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}
export function containsPhrase(text: string, phrase: string): boolean {
  const p = normalizeText(phrase);
  return (
    p.length > 0 && (" " + normalizeText(text) + " ").includes(" " + p + " ")
  );
}
