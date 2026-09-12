import { readdir, readFile } from "node:fs/promises";
import { filterListings, isRelevant } from "../lib/filter";
import type { RawListing } from "../lib/types";

type Label = { listing: RawListing; relevant: boolean | null; advertisement: boolean | null; normal: boolean | null; reviewed: boolean };
async function main() {
  const root = new URL("../fixtures/labeled/", import.meta.url);
  const files = (await readdir(root)).filter(f => f.endsWith(".json"));
  let total=0, reviewed=0, relevantCorrect=0, ads=0, removedAds=0, normal=0, falseRemoval=0;
  for (const file of files) {
    const fixture: { query: string; labels: Label[] } = JSON.parse(await readFile(new URL(file,root),"utf8"));
    total += fixture.labels.length;
    const output = filterListings(fixture.query,fixture.labels.map(l=>l.listing));
    fixture.labels.forEach((label,index)=>{
      if (!label.reviewed || label.relevant === null || label.advertisement === null || label.normal === null) return;
      reviewed++;
      const relevant = isRelevant(fixture.query,label.listing.title) && output[index].excludedReason !== "IRRELEVANT";
      if (relevant===label.relevant) relevantCorrect++;
      if(label.advertisement){ads++;if(output[index].excludedReason==="AD")removedAds++;}
      if(label.normal){normal++;if(output[index].excludedReason)falseRemoval++;}
    });
  }
  const rate=(a:number,b:number)=>b?`${(a/b*100).toFixed(1)}%`:"평가 불가";
  console.log(JSON.stringify({총매물:total,검토완료:reviewed,미검토:total-reviewed,관련성일치율:rate(relevantCorrect,reviewed),광고제거율:rate(removedAds,ads),정상매물오제거율:rate(falseRemoval,normal)},null,2));
  if(reviewed<total || !reviewed) console.log("사람이 라벨을 검토하기 전에는 정확도 목표 달성을 판정하지 않습니다.");
}
main().catch(e=>{console.error(e instanceof Error?e.message:"평가 실패");process.exitCode=1});
