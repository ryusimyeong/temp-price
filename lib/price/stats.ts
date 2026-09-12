import { filterListings } from "../filter";
import { MARKETS, type RawListing, type PriceStats, type SearchResult } from "../types";

export function quantile(sorted: number[], p: number) {
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  return sorted[lower] + (sorted[Math.ceil(index)] - sorted[lower]) * (index - lower);
}
const average = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

export function analyze(query: string, raw: RawListing[]): Pick<SearchResult, "summary" | "counts" | "listings" | "marketplaces" | "excludedBreakdown"> {
  const listings = filterListings(query, raw);
  for (const item of listings) if (!item.excludedReason && item.price !== null && item.price < 1000) item.excludedReason = "OUTLIER";
  const base = listings.filter(i => !i.excludedReason && i.price !== null);
  const prices = base.map(i => i.price!).sort((a, b) => a - b);
  let summary: PriceStats | null = null;
  if (prices.length >= 5) {
    const q1 = quantile(prices, 0.25), q3 = quantile(prices, 0.75);
    const iqr = q3 - q1;
    for (const item of base) if (item.price! < q1 - 1.5 * iqr || item.price! > q3 + 1.5 * iqr) item.excludedReason = "OUTLIER";
    const cleaned = base.filter(i => !i.excludedReason).map(i => i.price!);
    if (cleaned.length >= 5) summary = {
      count: prices.length, cleanedCount: cleaned.length,
      min: prices[0], max: prices.at(-1)!, average: average(prices), median: quantile(prices, 0.5),
      q1, q3, cleanedAverage: average(cleaned), warning: cleaned.length < 10 ? "표본 적음" : null,
    };
  }
  const excludedBreakdown = { FREE: 0, AD: 0, IRRELEVANT: 0, DUPLICATE: 0, OUTLIER: 0 };
  let valid = 0, unpriced = 0;
  for (const item of listings) {
    if (item.excludedReason) excludedBreakdown[item.excludedReason]++;
    else if (item.price === null) unpriced++;
    else valid++;
    if (summary && item.price !== null) item.diffPercent = (item.price - summary.cleanedAverage) / summary.cleanedAverage * 100;
  }
  return {
    summary, listings, excludedBreakdown,
    counts: { total: listings.length, valid, unpriced, excluded: Object.values(excludedBreakdown).reduce((a, b) => a + b, 0) },
    marketplaces: MARKETS.map(marketplace => {
      const values = listings.filter(i => i.marketplace === marketplace && !i.excludedReason && i.price !== null).map(i => i.price!).sort((a,b) => a-b);
      return { marketplace, count: values.length, average: values.length >= 5 ? average(values) : null, median: values.length >= 5 ? quantile(values, 0.5) : null };
    }),
  };
}
