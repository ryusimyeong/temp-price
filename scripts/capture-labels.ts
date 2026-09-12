import "dotenv/config";
import { mkdir, writeFile } from "node:fs/promises";
import { collectAll } from "../lib/collectors";
import { DEFAULT_REGION } from "../lib/regions";
const queries = ["아이폰 15 프로 256GB", "맥북 프로 M3", "플스5", "아이패드 에어 5", "갤럭시 S23"];
async function main() {
  await mkdir("fixtures/labeled", { recursive: true });
  for (const [index,query] of queries.entries()) {
    if (process.argv[2] && Number(process.argv[2]) !== index + 1) continue;
    const results = await collectAll(query, DEFAULT_REGION, AbortSignal.timeout(24000));
    const first = results.flatMap(r=>r.listings.slice(0,20));
    const chosen = new Set(first.map(i=>`${i.marketplace}:${i.externalId}`));
    const listings = [...first,...results.flatMap(r=>r.listings).filter(i=>!chosen.has(`${i.marketplace}:${i.externalId}`))].slice(0,40);
    const document = { query, region: DEFAULT_REGION, capturedAt: new Date().toISOString(),
      labels: listings.map(listing=>({ listing, relevant:null, advertisement:null, normal:null, reviewed:false })),
    };
    await writeFile(`fixtures/labeled/${index+1}.json`, JSON.stringify(document,null,2)+"\n");
    console.log(`[${index+1}/5] ${query}: ${listings.length}개 저장, 라벨 검토 대기`);
  }
}
main().catch(e=>{console.error(e instanceof Error?e.message:"수집 실패");process.exitCode=1});
