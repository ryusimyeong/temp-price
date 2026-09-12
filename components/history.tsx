"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Clock3, RefreshCw, ArrowRight } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { dateLabel, won, percent } from "@/lib/utils";
import { regionLabel } from "@/lib/regions";
import type { HistoryItem } from "@/lib/types";
import { Button } from "./ui/button";

export function History({ preview = false }: { preview?: boolean }) {
  const { data, isPending, error, refetch } = useQuery({ queryKey: ["history"], queryFn: async () => {
    const response = await fetch("/api/searches");
    const body = await response.json(); if (!response.ok) throw new Error(body.error);
    return body.searches as HistoryItem[];
  } });
  return <section className={preview ? "recent-section" : "history-section"}>
    {preview && <div className="section-heading"><h2><Clock3 size={18}/>최근 검색</h2><Link className="text-link" href="/history">전체 기록<ArrowRight size={15}/></Link></div>}
    {isPending ? <div className="empty-state" role="status">검색 기록을 불러오고 있습니다.</div> : error ? <div className="empty-state"><Clock3 size={26}/><p>{error.message}</p><Button variant="ghost" size="sm" onClick={() => void refetch()}>다시 불러오기</Button></div> : !data?.length ? <div className="empty-state"><Clock3 size={27}/><h3>첫 번째 시세를 찾아보세요</h3><p>검색한 상품의 가격과 변화가 이곳에 쌓입니다.</p></div> : preview ?
      <div className="recent-grid">{data.slice(0,3).map(item => <Link href={`/search?id=${item.id}`} className="recent-card" key={item.id}><div className="flex justify-between gap-3"><h3>{item.query}</h3><ArrowUpRight size={18}/></div><p>{regionLabel(item.region)}</p><strong>{won(item.cleanedAverage)}</strong><span>{dateLabel(item.createdAt)} · {item.count}개 기준</span></Link>)}</div> :
      <div className="history-list">{data.map(item => <article className="history-row" key={item.id}>
        <div><Link href={`/search?id=${item.id}`} className="history-title">{item.query}<ArrowUpRight size={16}/></Link><p className="muted text-sm mt-2">{regionLabel(item.region)} · {dateLabel(item.createdAt)}</p></div>
        <div><span className="eyebrow">정제평균</span><strong className="block mt-1">{won(item.cleanedAverage)}</strong><span className="muted text-xs">{item.count}개 기준</span></div>
        <div><span className="eyebrow">이전 검색 대비</span><strong className={`block mt-1 ${item.changePercent !== null && item.changePercent < 0 ? "text-emerald-700" : ""}`}>{percent(item.changePercent)}</strong><span className="muted text-xs">{item.changePercent == null ? "비교 가능한 기록 없음" : "동일 지역·마켓 기준"}</span></div>
        <Button asChild variant="outline" size="sm"><Link href={`/?q=${encodeURIComponent(item.query)}&region=${encodeURIComponent(item.region)}`}><RefreshCw size={14}/>재검색</Link></Button>
        {item.points.length >= 2 && <div className="trend-chart" aria-label={`${item.query} 과거 정제평균 변화`}><ResponsiveContainer width="100%" height={90}><LineChart data={item.points}><XAxis dataKey="createdAt" tickFormatter={v => dateLabel(v).split(" ").slice(0,2).join(" ")} tick={{ fontSize: 10 }} axisLine={false} tickLine={false}/><Tooltip labelFormatter={v => dateLabel(String(v))} formatter={v => [won(Number(v)), "정제평균"]}/><Line isAnimationActive={false} type="linear" dataKey="price" stroke="#16765b" strokeWidth={2} dot={{ r: 3 }} connectNulls={false}/></LineChart></ResponsiveContainer></div>}
      </article>)}</div>}
    {!preview && <p className="muted text-xs mt-5">최근 검색 50회 내역을 상품·지역별로 묶어 표시합니다. 통계는 현재 정제 기준으로 다시 계산됩니다.</p>}
  </section>;
}
