export const MARKETS = ["daangn", "bunjang"] as const;
export type Marketplace = (typeof MARKETS)[number];
export const MARKET_NAMES = { daangn: "당근", bunjang: "번개장터" };
export const REASONS = { FREE: "무료·나눔", AD: "광고·매입", IRRELEVANT: "관련 없는 상품", DUPLICATE: "중복", OUTLIER: "가격 이상치" } as const;
export type ExcludedReason = keyof typeof REASONS;
export interface RawListing {
  marketplace: Marketplace;
  externalId: string;
  url: string;
  title: string;
  priceText: string;
  imageUrl?: string;
  location?: string;
  sellerKey?: string;
  postedText?: string;
}
export interface CleanListing extends RawListing {
  normalizedTitle: string;
  price: number | null;
  excludedReason: ExcludedReason | null;
  diffPercent: number | null;
}
export interface PriceStats {
  count: number;
  cleanedCount: number;
  min: number;
  max: number;
  average: number;
  median: number;
  q1: number;
  q3: number;
  cleanedAverage: number;
  warning: string | null;
}
export interface MarketResult {
  marketplace: Marketplace;
  status: "success" | "partial" | "failed";
  listings: RawListing[];
  code?: string;
  durationMs: number;
}
export type MarketInfo = Omit<MarketResult, "listings"> & { fetchedCount: number };
export interface SearchResult {
  searchId: string | null;
  query: string;
  region: string;
  createdAt: string;
  status: "success" | "partial" | "failed";
  markets: MarketInfo[];
  summary: PriceStats | null;
  counts: { total: number; valid: number; excluded: number; unpriced: number };
  marketplaces: { marketplace: Marketplace; count: number; average: number | null; median: number | null }[];
  excludedBreakdown: Record<ExcludedReason, number>;
  listings: CleanListing[];
  storageError?: string;
}
export interface HistoryItem {
  id: string;
  query: string;
  region: string;
  createdAt: string;
  cleanedAverage: number | null;
  count: number;
  status: SearchResult["status"];
  changePercent: number | null;
  points: { id: string; createdAt: string; price: number | null }[];
}
