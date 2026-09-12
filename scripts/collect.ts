import "dotenv/config";
import { collectAll } from "../lib/collectors";
import { analyze } from "../lib/price/stats";
import { DEFAULT_REGION } from "../lib/regions";
async function main() {
  const query = process.argv[2] ?? "아이폰 15 프로 256GB";
  const start = Date.now();
  const results = await collectAll(query, DEFAULT_REGION, AbortSignal.timeout(24000));
  const analysis = analyze(query, results.flatMap(r => r.listings));
  console.log(JSON.stringify({ query, durationMs: Date.now() - start,
    markets: results.map(({ listings, ...r }) => ({ ...r, count: listings.length })),
    counts: analysis.counts, summary: analysis.summary, excluded: analysis.excludedBreakdown,
  }, null, 2));
}
main().catch(e => { console.error(e instanceof Error ? e.message : "수집 실패"); process.exitCode = 1; });
