import { load } from "cheerio";
import type { RawListing } from "../types";
import type { CollectorContext } from "./types";
import { assertAccess, CollectorError, pause } from "./fetch";
import { navigate, withPage } from "./browser";

export function parseDaangn(html: string): RawListing[] {
  const $ = load(html, { scriptingEnabled: false });
  const cards = $('a[data-gtm="search_article"]');
  const items: RawListing[] = [];
  cards.each((_, el) => {
    const card = $(el);
    const href = card.attr("href");
    if (!href) throw new CollectorError("PARSER_CHANGED");
    const url = new URL(href, "https://www.daangn.com");
    const slug = decodeURIComponent(url.pathname).split("/").filter(Boolean).at(-1);
    const leaves = card.find("span").filter((_, e) => $(e).children().length === 0).map((_,e) => $(e).text().trim()).get().filter(Boolean);
    const priceIndex = leaves.findIndex(t => /^(?:[\d,]+원|나눔|무료|가격제안|가격문의)$/.test(t));
    const title = card.find('span[class*="fontWeight_regular"]').first().text().trim() || leaves[priceIndex - 1];
    if (!slug || !title || priceIndex < 0 || url.hostname !== "www.daangn.com") throw new CollectorError("PARSER_CHANGED");
    items.push({
      marketplace: "daangn", externalId: slug.split("-").at(-1)!, url: url.origin + url.pathname,
      title, priceText: leaves[priceIndex], imageUrl: card.find("img").first().attr("src"),
      location: leaves[priceIndex + 1], postedText: card.find("time").text().trim() || undefined,
    });
  });
  if (!cards.length && !/검색 결과가 없|검색결과가 없|검색된 결과가 없|검색한 결과가 없|찾는 상품이 없/.test($.text())) throw new CollectorError("PARSER_CHANGED");
  return items;
}

export async function collectDaangn(ctx: CollectorContext) {
  return withPage(ctx, async page => {
    const url = new URL("https://www.daangn.com/kr/buy-sell/");
    url.searchParams.set("search", ctx.query);
    url.searchParams.set("in", ctx.region);
    await navigate(page, url.href, ctx.signal);
    const initial = new Map(parseDaangn(await page.content()).map(item => [item.externalId, item]));
    // 초기 HTML의 noscript 이미지는 파서가 읽고, 표시 시간은 hydration을 잠깐 기다립니다.
    await page.waitForSelector('a[data-gtm="search_article"] time', { state: "attached", timeout: 1500 }).catch(() => {});
    const seen = new Set<string>();
    for (let round = 0; round < 5; round++) {
      ctx.signal.throwIfAborted();
      const html = await page.content();
      assertAccess(200, html);
      const items = parseDaangn(html).map(item => ({ ...item, imageUrl: item.imageUrl ?? initial.get(item.externalId)?.imageUrl }));
      const fresh = items.filter(i => !seen.has(i.externalId));
      if (round && !fresh.length) return;
      fresh.forEach(i => seen.add(i.externalId));
      ctx.emit(fresh);
      if (seen.size >= 100 || !items.length) return;
      const more = page.getByRole("button", { name: "더보기", exact: true }).first();
      if (!await more.count() || !await more.isVisible()) return;
      await pause(ctx.signal);
      await more.click();
      await page.waitForFunction(count => document.querySelectorAll('a[data-gtm="search_article"]').length > count, items.length, { timeout: 2500 }).catch(() => {});
    }
  });
}
