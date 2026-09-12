import { createHash } from "node:crypto";
import type { CleanListing, RawListing } from "../types";
import { normalizeTitle } from "../normalize/title";
import { parsePrice } from "../normalize/price";

const ADS = /매입|삽니다|사요|구해요|구합니다|전국최고가|대량|도매|업체|문의주세요/;
const ACCESSORIES = /케이스|필름|강화유리|충전기|케이블|거치대|스트랩|부품|파손|액정만|박스만|정품박스|깡통|공기계아님/;
const ALIASES: Record<string, string[]> = {
  아이폰: ["아이폰", "iphone"], 프로: ["프로", "pro"], 맥북: ["맥북", "macbook"],
  아이패드: ["아이패드", "ipad"], 에어: ["에어", "air"], 맥스: ["맥스", "max"],
  갤럭시: ["갤럭시", "galaxy"], 플스: ["플스", "ps", "플레이스테이션"],
};
function canonical(text: string) {
  let result = text.normalize("NFKC").toLowerCase();
  for (const [key, alternatives] of Object.entries(ALIASES)) {
    for (const alias of alternatives) result = result.replaceAll(alias, ` ${key} `);
  }
  return result.replace(/(\p{L})(\d)/gu, "$1 $2").replace(/(\d)(\p{L})/gu, "$1 $2");
}
export function isRelevant(query: string, title: string) {
  // TRD대로 용량은 선택 토큰입니다. 256과 512의 불일치를 배제하지 않습니다.
  const tokens: string[] = canonical(query).replace(/\b(?:64|128|256|512|1024)\s*(?:gb|기가)?\b/g, " ")
    .replace(/\b[1248]\s*tb\b/g, " ").match(/[\p{L}\p{N}]+/gu) ?? [];
  const target: string[] = canonical(title).match(/[\p{L}\p{N}]+/gu) ?? [];
  return tokens.filter(t => !["gb", "기가", "tb"].includes(t)).every(t => target.includes(t));
}
export function sellerFingerprint(value?: string) {
  return value ? createHash("sha256").update(value).digest("hex").slice(0, 24) : undefined;
}
export function filterListings(query: string, raw: RawListing[]): CleanListing[] {
  const seenIds = new Set<string>();
  const seenPrints = new Set<string>();
  return raw.map(listing => {
    const title = normalizeTitle(listing.title);
    const price = parsePrice(listing.priceText);
    const item: CleanListing = { ...listing, normalizedTitle: title, price, excludedReason: null, diffPercent: null };
    const id = `${listing.marketplace}:${listing.externalId}`;
    const fingerprint = `${listing.marketplace}:${title}:${price ?? listing.priceText}:${listing.sellerKey ?? ""}`;
    if (price === 0 || /나눔|무료|드립니다/.test(title)) item.excludedReason = "FREE";
    else if (ADS.test(title)) item.excludedReason = "AD";
    else if (ACCESSORIES.test(title) || !isRelevant(query, listing.title)) item.excludedReason = "IRRELEVANT";
    else if (seenIds.has(id) || seenPrints.has(fingerprint)) item.excludedReason = "DUPLICATE";
    seenIds.add(id);
    seenPrints.add(fingerprint);
    return item;
  });
}
