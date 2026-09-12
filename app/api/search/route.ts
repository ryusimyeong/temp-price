import { NextResponse } from "next/server";
import { z } from "zod";
import { collectAll } from "@/lib/collectors";
import { analyze } from "@/lib/price/stats";
import { REGIONS, DEFAULT_REGION } from "@/lib/regions";
import { saveSearch } from "@/lib/searches";
import { StorageError } from "@/lib/db";
import type { SearchResult } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 35;
const Input = z.object({
  query: z.string().trim().min(2, "검색어를 두 글자 이상 입력해 주세요.").max(100),
  region: z.string().refine(value => REGIONS.some(r => r.value === value), "지원하는 지역을 선택해 주세요.").default(DEFAULT_REGION),
});
// 개인용 앱에서 같은 인스턴스의 중복 클릭·동시 검색으로 브라우저가 누적되지 않게 합니다.
let active = false;
export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "올바른 검색 요청이 아닙니다." }, { status: 400 }); }
  const input = Input.safeParse(body);
  if (!input.success) return NextResponse.json({ error: input.error.issues[0].message }, { status: 400 });
  if (active) return NextResponse.json({ error: "진행 중인 검색이 있습니다. 잠시 뒤 다시 검색해 주세요." }, { status: 409 });
  active = true;
  const started = Date.now();
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(24000)]);
  try {
    const collected = await collectAll(input.data.query, input.data.region, signal);
    const markets = collected.map(({ listings, ...market }) => ({ ...market, fetchedCount: listings.length }));
    const status = markets.every(m => m.status === "success") ? "success" : markets.every(m => m.status === "failed") ? "failed" : "partial";
    let result: SearchResult = {
      ...input.data, searchId: null, createdAt: new Date().toISOString(), status, markets,
      ...analyze(input.data.query, collected.flatMap(m => m.listings)),
    };
    try {
      if (request.signal.aborted || Date.now() - started > 26000) throw new StorageError("DATABASE_UNAVAILABLE");
      result = await saveSearch(result);
    } catch (error) {
      result.storageError = error instanceof StorageError ? error.code : "DATABASE_UNAVAILABLE";
    }
    console.info("[search]", JSON.stringify({ status, durationMs: Date.now() - started, markets, counts: result.counts, saved: Boolean(result.searchId) }));
    return NextResponse.json(result, { status: result.storageError ? 503 : 200, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "검색을 완료하지 못했습니다. 다시 시도해 주세요." }, { status: 500 });
  } finally { active = false; }
}
