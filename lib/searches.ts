import type { Prisma, Search, Listing } from "../generated/prisma/client";
import { db } from "./db";
import { analyze } from "./price/stats";
import { queryKey } from "./normalize/title";
import type { HistoryItem, MarketInfo, Marketplace, RawListing, SearchResult } from "./types";

export async function saveSearch(result: SearchResult) {
  const search = await db().$transaction(async tx => tx.search.create({
    data: {
      query: result.query, queryKey: queryKey(result.query), region: result.region,
      status: result.status, markets: result.markets as unknown as Prisma.InputJsonValue,
      listings: { createMany: { data: result.listings.map((item, position) => ({
        position, marketplace: item.marketplace, externalId: item.externalId,
        url: item.url, title: item.title, normalizedTitle: item.normalizedTitle,
        priceText: item.priceText, price: item.price, imageUrl: item.imageUrl,
        location: item.location, sellerKey: item.sellerKey, postedText: item.postedText,
        excludedReason: item.excludedReason,
      })) } },
    }, select: { id: true, createdAt: true },
  }), { maxWait: 1000, timeout: 3000 });
  return { ...result, searchId: search.id, createdAt: search.createdAt.toISOString() };
}

function restore(row: Search & { listings: Listing[] }): SearchResult {
  const raw: RawListing[] = row.listings.map(item => ({
    marketplace: item.marketplace as Marketplace, externalId: item.externalId,
    url: item.url, title: item.title, priceText: item.priceText,
    imageUrl: item.imageUrl ?? undefined, location: item.location ?? undefined,
    sellerKey: item.sellerKey ?? undefined, postedText: item.postedText ?? undefined,
  }));
  return {
    searchId: row.id, query: row.query, region: row.region, createdAt: row.createdAt.toISOString(),
    status: row.status as SearchResult["status"], markets: row.markets as unknown as MarketInfo[],
    ...analyze(row.query, raw),
  };
}
export async function getSearch(id: string) {
  const row = await db().search.findUnique({ where: { id }, include: { listings: { orderBy: { position: "asc" } } } });
  return row ? restore(row) : null;
}
const participation = (result: SearchResult) => result.markets.filter(m => m.status === "success").map(m => m.marketplace).sort().join(",");
export async function getHistory(): Promise<HistoryItem[]> {
  const rows = await db().search.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { listings: { orderBy: { position: "asc" } } } });
  const groups = new Map<string, SearchResult[]>();
  for (const row of rows) {
    const key = JSON.stringify([row.queryKey, row.region]);
    const group = groups.get(key) ?? []; group.push(restore(row)); groups.set(key, group);
  }
  return [...groups.values()].map(group => {
    const latest = group[0];
    const comparable = latest.markets.every(m => m.status !== "partial") && latest.summary;
    const previous = comparable ? group.slice(1).find(item => item.summary && item.markets.every(m => m.status !== "partial") && participation(item) === participation(latest)) : undefined;
    return {
      id: latest.searchId!, query: latest.query, region: latest.region, createdAt: latest.createdAt,
      cleanedAverage: latest.summary?.cleanedAverage ?? null, count: latest.counts.valid, status: latest.status,
      changePercent: previous ? (latest.summary!.cleanedAverage - previous.summary!.cleanedAverage) / previous.summary!.cleanedAverage * 100 : null,
      points: group.slice().reverse().map(item => ({ id: item.searchId!, createdAt: item.createdAt,
        price: item.markets.every(m => m.status !== "partial") && participation(item) === participation(latest) ? item.summary?.cleanedAverage ?? null : null })),
    };
  });
}
