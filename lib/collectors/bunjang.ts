import { z } from "zod";
import { load } from "cheerio";
import type { RawListing } from "../types";
import { sellerFingerprint } from "../filter";
import { CollectorError, fetchPublic, pause } from "./fetch";
import { navigate, withPage } from "./browser";
import type { CollectorContext } from "./types";

const Product = z.object({
  pid: z.union([z.string(), z.number()]), name: z.string().min(1), price: z.union([z.string(), z.number()]),
  productImage: z.string().optional(), updatedBefore: z.string().optional(),
  shop: z.object({ uid: z.union([z.string(), z.number()]) }).optional(),
});
const PageData = z.object({ data: z.array(z.unknown()), nextCursor: z.string().nullable().optional(), cursor: z.string().nullable().optional() });
export function parseBunjang(input: unknown): { listings: RawListing[]; cursor: string | null } {
  const root = z.object({ data: z.unknown() }).safeParse(input);
  if (!root.success) throw new CollectorError("PARSER_CHANGED");
  const envelope = root.data.data as Record<string, unknown>;
  const spec = z.object({ searchSpec: z.object({ uiBlockList: z.array(z.object({ id: z.string(), searchResponse: z.unknown().optional() })) }) }).safeParse(envelope);
  const body = spec.success ? spec.data.searchSpec.uiBlockList.find(b => b.id === "mainGrid")?.searchResponse : envelope;
  const parsed = PageData.safeParse(body);
  if (!parsed.success) throw new CollectorError("PARSER_CHANGED");
  const listings: RawListing[] = [];
  for (const entry of parsed.data.data) {
    if (typeof entry === "object" && entry !== null && "type" in entry && entry.type === "EXT_AD") continue;
    const result = Product.safeParse(entry);
    if (!result.success) throw new CollectorError("PARSER_CHANGED");
    const item = result.data;
    listings.push({
      marketplace: "bunjang", externalId: String(item.pid), url: `https://m.bunjang.co.kr/products/${item.pid}`,
      title: item.name, priceText: String(item.price), imageUrl: item.productImage?.replace("{res}", "640"),
      postedText: item.updatedBefore, sellerKey: sellerFingerprint(item.shop?.uid.toString()),
    });
  }
  return { listings, cursor: parsed.data.nextCursor ?? parsed.data.cursor ?? null };
}

async function collectHttp(ctx: CollectorContext) {
  let cursor: string | null = null;
  const seen = new Set<string>();
  const cursors = new Set<string>();
  for (let round = 0; round < 5; round++) {
    const url = new URL(round ? "https://api.bunjang.co.kr/api/search/v8/web/search" : "https://api.bunjang.co.kr/api/search/v8/pw/product/specs/keyword");
    url.searchParams.set("q", ctx.query);
    if (cursor) { url.searchParams.set("policyKey", "pw.product.keyword"); url.searchParams.set("cursor", cursor); url.searchParams.set("size", "60"); }
    const response = await fetchPublic(url.href, ctx.signal);
    let json: unknown;
    try { json = JSON.parse(response); } catch { throw new CollectorError("PARSER_CHANGED"); }
    const parsed = parseBunjang(json);
    const fresh = parsed.listings.filter(i => !seen.has(i.externalId));
    fresh.forEach(i => seen.add(i.externalId));
    ctx.emit(fresh);
    if (!fresh.length || seen.size >= 100 || !parsed.cursor || cursors.has(parsed.cursor)) return;
    cursor = parsed.cursor;
    cursors.add(cursor);
    await pause(ctx.signal);
  }
}

export function parseBunjangHtml(html: string): RawListing[] {
  const $ = load(html);
  const items: RawListing[] = [];
  $('a[href^="/products/"]').each((_, el) => {
    const card = $(el), id = card.attr("href")?.match(/^\/products\/(\d+)/)?.[1];
    if (!id || !card.find("img").length) return;
    const paragraphs = card.find("p").map((_, p) => $(p).text().trim()).get();
    const priceText = paragraphs.find(t => /^[\d,]+원$/.test(t));
    const title = paragraphs.find(t => t !== priceText && t !== "AD");
    if (!priceText || !title) throw new CollectorError("PARSER_CHANGED");
    items.push({ marketplace: "bunjang", externalId: id, url: `https://m.bunjang.co.kr/products/${id}`, title, priceText, imageUrl: card.find("img").attr("src") });
  });
  if (!items.length && !/검색 결과가 없|검색결과가 없|상품0/.test($.text())) throw new CollectorError("PARSER_CHANGED");
  return items;
}

export async function collectBunjang(ctx: CollectorContext) {
  try { await collectHttp(ctx); }
  catch (error) {
    if (!(error instanceof CollectorError) || !["PARSER_CHANGED", "NOT_FOUND"].includes(error.code)) throw error;
    ctx.signal.throwIfAborted();
    await withPage(ctx, async page => {
      await navigate(page, `https://m.bunjang.co.kr/keywords/${encodeURIComponent(ctx.query)}`, ctx.signal);
      await page.waitForSelector('a[href^="/products/"]', { timeout: 5000 }).catch(() => {});
      const seen = new Set<string>();
      for (let round = 0; round < 4; round++) {
        const listings = parseBunjangHtml(await page.content());
        const fresh = listings.filter(i => !seen.has(i.externalId));
        fresh.forEach(i => seen.add(i.externalId));
        ctx.emit(fresh);
        if (!fresh.length || seen.size >= 100) break;
        const more = page.getByRole("button", { name: "더보기", exact: true }).first();
        if (!await more.count()) break;
        await pause(ctx.signal); await more.click();
        await page.waitForFunction(count => document.querySelectorAll('a[href^="/products/"]').length > count, listings.length, { timeout: 2500 }).catch(() => {});
      }
    });
  }
}
