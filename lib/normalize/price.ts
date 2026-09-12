export function parsePrice(text: string): number | null {
  const value = text.normalize("NFKC").trim();
  if (/^(나눔|무료|무료나눔)$/.test(value)) return 0;
  if (/제안|문의|협의/.test(value)) return null;
  const first = value.split(/[~～–]/)[0].replace(/[,\s]/g, "").replace(/원$/, "");
  const match = first.match(/^(\d+(?:\.\d+)?)(만)?(\d+)?$/);
  if (!match) return null;
  const price = Number(match[1]) * (match[2] ? 10000 : 1) + Number(match[3] ?? 0);
  return Number.isSafeInteger(price) && price >= 0 && price <= 2147483647 ? price : null;
}
