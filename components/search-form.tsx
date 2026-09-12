"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, MapPin, LoaderCircle, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { DEFAULT_REGION, REGIONS } from "@/lib/regions";
import type { SearchResult } from "@/lib/types";

export function SearchForm({ initialQuery = "", initialRegion, compact = false }: { initialQuery?: string; initialRegion?: string; compact?: boolean }) {
  const router = useRouter(), client = useQueryClient();
  const regionRef = useRef<HTMLSelectElement>(null);
  const submitting = useRef(false);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!initialRegion && regionRef.current) {
      try { const saved = localStorage.getItem("usedprice.region"); if (REGIONS.some(r => r.value === saved)) regionRef.current.value = saved!; } catch {}
    }
  }, [initialRegion]);
  const mutation = useMutation({
    mutationFn: async (params: { query: string; region: string }) => {
      const response = await fetch("/api/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(params), signal: AbortSignal.timeout(35000) });
      const data = await response.json();
      // DB 오류 응답에도 실제 수집 결과가 있으면 사용자에게 보여줍니다.
      if (!response.ok && !data.listings) throw new Error(data.error ?? "검색을 완료하지 못했습니다.");
      return data as SearchResult;
    },
    onSuccess: result => {
      setProgress(100);
      const id = result.searchId ?? `unsaved-${crypto.randomUUID()}`;
      client.setQueryData(["search", id], result);
      void client.invalidateQueries({ queryKey: ["history"] });
      window.setTimeout(() => router.push(`/search?id=${encodeURIComponent(id)}`), 300);
    },
    onError: () => { setProgress(0); },
    onSettled: () => { submitting.current = false; },
  });
  useEffect(() => {
    if (!mutation.isPending) return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const next = elapsed < 3 ? 5 + elapsed / 3 * 23
        : elapsed < 10 ? 28 + (elapsed - 3) / 7 * 38
        : elapsed < 18 ? 66 + (elapsed - 10) / 8 * 22
        : Math.min(92, 88 + (elapsed - 18) / 4);
      setProgress(Math.round(next));
    }, 250);
    return () => window.clearInterval(timer);
  }, [mutation.isPending]);
  const progressLabel = progress < 28 ? "검색 준비 중"
    : progress < 66 ? "두 마켓의 매물 수집 중"
    : progress < 88 ? "광고와 이상치 정리 중"
    : progress < 100 ? "시세 계산 및 저장 중" : "검색 완료";
  return <form className={compact ? "search-form compact" : "search-form"} onSubmit={event => {
    event.preventDefault(); if (submitting.current) return;
    const form = new FormData(event.currentTarget);
    const query = String(form.get("query") ?? "").trim();
    const region = String(form.get("region") ?? DEFAULT_REGION);
    if (query.length < 2) return;
    submitting.current = true;
    setProgress(5);
    try { localStorage.setItem("usedprice.region", region); } catch {}
    mutation.mutate({ query, region });
  }}>
    <div className="search-input-row"><Search size={22} className="text-stone-400 shrink-0" aria-hidden/>
      <label className="sr-only" htmlFor="query">상품 검색어</label>
      <input id="query" name="query" defaultValue={initialQuery} minLength={2} maxLength={100} required placeholder="어떤 물건의 시세가 궁금하세요?" disabled={mutation.isPending} autoComplete="off"/>
      <Button size={compact ? "default" : "lg"} disabled={mutation.isPending} type="submit">{mutation.isPending ? <><LoaderCircle size={17} className="animate-spin"/>검색 중</> : <>시세 검색<ArrowRight size={17}/></>}</Button>
    </div>
    <div className="search-meta"><label className="region-select"><MapPin size={15}/><span className="sr-only">당근 검색 지역</span><select name="region" ref={regionRef} defaultValue={initialRegion ?? DEFAULT_REGION} disabled={mutation.isPending}>{REGIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select></label><span>당근 지역 기준 · 번개장터 전국</span></div>
    {(mutation.isPending || progress === 100) && <div className="search-progress" role="status" aria-live="polite">
      <div className="search-progress-heading"><span>{progressLabel}</span><strong>{progress}%</strong></div>
      <div className="search-progress-track" role="progressbar" aria-label="예상 검색 진행률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        <span style={{ width: `${progress}%` }}/>
      </div>
      <p>수집 시간에 따른 예상 진행률입니다. 보통 15~20초 정도 걸립니다.</p>
    </div>}
    {mutation.error && <p className="notice error" role="alert">{mutation.error instanceof Error && mutation.error.name === "TimeoutError" ? "검색 응답이 지연되고 있습니다. 잠시 뒤 기록을 확인해 주세요." : mutation.error.message}</p>}
  </form>;
}
