export function normalizeTitle(text: string) {
  return text.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}
export function queryKey(text: string) {
  return text.normalize("NFKC").toLowerCase().trim().replace(/\s+/g, " ");
}
