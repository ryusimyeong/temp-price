"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, AlertCircle, ChartColumnIncreasing, SlidersHorizontal, Check, CircleHelp } from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { MARKET_NAMES, REASONS, type SearchResult, type ExcludedReason } from "@/lib/types";
import { won, dateLabel } from "@/lib/utils";
import { regionLabel } from "@/lib/regions";
import { SearchForm } from "./search-form";
import { ListingCard } from "./listings";
import { Button } from "./ui/button";

const ERROR_TEXT: Record<string,string> = { DISABLED: "현재 수집 중지", HTTP_403: "접근 제한", HTTP_429: "요청 제한", CAPTCHA: "보안 확인 필요", TIMEOUT: "수집 시간 초과", PARSER_CHANGED: "목록 구조 변경", FETCH_FAILED: "일시적인 연결 실패" };

function Distribution({ result }: { result: SearchResult }) {
  if (!result.summary) return <div className="empty-chart">표본이 5개 이상 모이면 가격 분포가 표시됩니다.</div>;
  const values = result.listings.filter(i => (!i.excludedReason || i.excludedReason === "OUTLIER") && i.price !== null && i.price >= 1000).map(i => i.price!);
  const min = Math.min(...values), max = Math.max(...values);
  const step = Math.max(1, Math.ceil((max - min) / 10));
  const data = Array.from({length: min === max ? 1 : 10}, (_,index) => {
    const start = min + index * step, end = start + step;
    return { label: `${Math.round(start / 10000)}만`, range: `${won(start)} ~ ${won(end)}`, count: values.filter(v => v >= start && (index === 9 || min === max ? v <= end : v < end)).length };
  });
  return <><div className="histogram"><ResponsiveContainer width="100%" height={210}><BarChart data={data} margin={{ top: 15, right: 5, left: -30, bottom: 0 }}><CartesianGrid vertical={false} stroke="#eceee9"/><XAxis dataKey="label" tick={{ fontSize: 11, fill: "#81877c" }} axisLine={false} tickLine={false}/><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#81877c" }} axisLine={false} tickLine={false}/><Tooltip cursor={{fill:"#f0f5ef"}} labelFormatter={(_,p) => p[0]?.payload.range} formatter={v => [`${v}개`, "매물"]}/><Bar isAnimationActive={false} dataKey="count" fill="#438c73" radius={[5,5,0,0]} maxBarSize={45}/></BarChart></ResponsiveContainer></div><p className="muted text-xs">정제 전 {result.summary.count}개 · 가격 이상치를 포함한 분포</p></>;
}

function ResultBody({ result }: { result: SearchResult }) {
  const params = useSearchParams(), router = useRouter();
  const market = params.get("market") ?? "all", sort = params.get("sort") ?? "asc";
  const update = (key: string, value: string) => { const next = new URLSearchParams(params); next.set(key,value); router.replace(`/search?${next}`, { scroll: false }); };
  const visible = result.listings.filter(i => (!i.excludedReason || i.excludedReason === "OUTLIER") && (market === "all" || market === i.marketplace)).sort((a,b) => a.price === null ? (b.price === null ? 0 : 1) : b.price === null ? -1 : sort === "desc" ? b.price - a.price : a.price - b.price);
  const summary = result.summary;
  return <>
    <SearchForm key={result.searchId ?? result.createdAt} initialQuery={result.query} initialRegion={result.region} compact/>
    <div className="result-heading"><div><span className="eyebrow">PRICE REPORT</span><h1>{result.query}</h1><p className="muted">{regionLabel(result.region)} · {dateLabel(result.createdAt)}</p></div><span className="report-count">{result.counts.total}개 발견 <span> / </span> <b>{result.counts.valid}개 유효</b> <span> / </span> {result.counts.excluded}개 제외{result.counts.unpriced > 0 && ` / 가격 미정 ${result.counts.unpriced}개`}</span></div>
    {result.storageError && <div className="notice warning" role="alert"><AlertCircle size={18}/><span>검색 결과는 가져왔지만 기록을 저장하지 못했습니다. 이 결과는 새로고침하면 사라집니다.</span></div>}
    {result.status !== "success" && <div className="notice warning" role="status"><AlertCircle size={18}/><span>{result.status === "failed" ? "두 마켓의 검색 결과를 가져오지 못했습니다." : "일부 마켓의 수집이 완료되지 않았습니다. 수집된 매물만 기준으로 표시합니다."} {result.markets.filter(m => m.code).map(m => `${MARKET_NAMES[m.marketplace]}: ${ERROR_TEXT[m.code!] ?? "수집 실패"}`).join(" · ")}</span></div>}
    {!summary && <div className="notice">데이터 부족 · 정제 전후 표본이 각각 5개 이상일 때 가격 통계를 제공합니다.</div>}
    <section className="stats-grid" aria-label="시세 요약">
      <div className="stat-card featured"><div className="stat-label">정제평균<span>기준가</span></div><strong>{won(summary?.cleanedAverage)}</strong><p>이상치를 제외한 {summary?.cleanedCount ?? result.counts.valid}개 기준 {summary?.warning && <b>· {summary.warning}</b>}</p></div>
      {[{label:"중앙값",value:summary?.median},{label:"최저가",value:summary?.min},{label:"최고가",value:summary?.max}].map(stat => <div className="stat-card" key={stat.label}><div className="stat-label">{stat.label}</div><strong>{won(stat.value)}</strong><p>정제 전 {summary?.count ?? 0}개 기준</p></div>)}
    </section>
    <div className="range-strip"><span><CircleHelp size={15}/>적정가 범위 <strong>{summary ? `${won(summary.q1)} ~ ${won(summary.q3)}` : "데이터 부족"}</strong><small>Q1 ~ Q3</small></span><span>산술평균 <strong>{won(summary?.average)}</strong></span></div>
    <div className="analysis-grid"><section className="panel"><div className="section-heading"><h2>마켓별 비교</h2><span className="eyebrow">MARKET COMPARISON</span></div><table className="market-table"><thead><tr><th scope="col">기준</th>{result.marketplaces.map(m => <th scope="col" key={m.marketplace}><span className={`market-badge ${m.marketplace}`}>{MARKET_NAMES[m.marketplace]}</span></th>)}</tr></thead><tbody><tr><th scope="row">유효 매물</th>{result.marketplaces.map(m => <td key={m.marketplace}>{m.count}개</td>)}</tr><tr><th scope="row">평균</th>{result.marketplaces.map(m => <td key={m.marketplace}>{won(m.average)}</td>)}</tr><tr><th scope="row">중앙값</th>{result.marketplaces.map(m => <td key={m.marketplace}>{won(m.median)}</td>)}</tr></tbody></table><div className="market-status">{result.markets.map(m => <span key={m.marketplace}>{m.status === "success" ? <Check size={13}/> : <AlertCircle size={13}/>} {MARKET_NAMES[m.marketplace]} {m.fetchedCount}개 수집{m.status !== "success" && " · 미완료"}</span>)}</div><p className="muted text-xs mt-3">이상치 제외 후 마켓별 표본 5개 이상일 때 통계를 표시합니다.</p></section>
      <section className="panel"><div className="section-heading"><h2><ChartColumnIncreasing size={18}/>가격 분포</h2><span className="eyebrow">DISTRIBUTION</span></div><Distribution result={result}/></section></div>
    <section className="listings-section"><div className="section-heading listing-heading"><h2>실제 매물 <span className="muted font-normal">{visible.length}</span></h2><div className="listing-controls"><SlidersHorizontal size={15}/><label><span className="sr-only">마켓 필터</span><select value={market} onChange={e => update("market",e.target.value)}><option value="all">모든 마켓</option><option value="daangn">당근</option><option value="bunjang">번개장터</option></select></label><label><span className="sr-only">가격 정렬</span><select value={sort} onChange={e => update("sort",e.target.value)}><option value="asc">가격 낮은순</option><option value="desc">가격 높은순</option></select></label></div></div><p className="muted text-xs mb-5">시세 대비 비율은 전체 정제평균 기준입니다. 필터는 매물 목록에만 적용됩니다.</p><div className="listing-grid">{visible.map((item,index) => <ListingCard key={`${item.marketplace}:${item.externalId}:${index}`} item={item}/>)}</div>{!visible.length && <div className="empty-state">표시할 매물이 없습니다. 검색어나 마켓 필터를 바꿔보세요.</div>}</section>
    <section className="exclusions"><div className="section-heading"><h2>어떤 매물이 제외됐나요?</h2><span className="muted text-sm">총 {result.counts.excluded}개</span></div><p className="muted text-sm mb-5">각 사유를 펼쳐 실제로 걸러진 매물을 확인할 수 있습니다.</p>{(Object.keys(REASONS) as ExcludedReason[]).map(reason => <details key={reason}><summary>{REASONS[reason]}<span>{result.excludedBreakdown[reason]}개</span></summary><div className="listing-grid">{result.listings.filter(i => i.excludedReason === reason).map((item,index) => <ListingCard key={`${item.marketplace}:${item.externalId}:${index}`} item={item}/>)}</div>{result.excludedBreakdown[reason] === 0 && <p className="muted text-sm py-3">이 사유로 제외된 매물이 없습니다.</p>}</details>)}</section>
  </>;
}

export function Results() {
  const params = useSearchParams();
  const id = params.get("id");
  const { data, isPending, error } = useQuery({ queryKey: ["search", id], enabled: Boolean(id), staleTime: id?.startsWith("unsaved-") ? Infinity : 60000,
    queryFn: async () => {
      if (id?.startsWith("unsaved-")) throw new Error("저장되지 않은 결과입니다. 홈에서 다시 검색해 주세요.");
      const response = await fetch(`/api/searches/${encodeURIComponent(id!)}`);
      const body = await response.json(); if (!response.ok) throw new Error(body.error);
      return body as SearchResult;
    },
  });
  if (!id || error) return <div className="empty-state large"><AlertCircle size={30}/><h1>{error?.message ?? "먼저 상품을 검색해 주세요."}</h1><Button asChild><Link href="/"><ArrowLeft size={16}/>검색으로 돌아가기</Link></Button></div>;
  if (isPending) return <div className="empty-state large" role="status">검색 결과를 불러오고 있습니다.</div>;
  return data ? <ResultBody result={data}/> : null;
}
