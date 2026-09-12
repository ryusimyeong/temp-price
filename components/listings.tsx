"use client";
import { ArrowUpRight, ImageOff } from "lucide-react";
import { useState } from "react";
import { MARKET_NAMES, REASONS, type CleanListing } from "@/lib/types";
import { won, percent } from "@/lib/utils";

function safeUrl(value: string | undefined) {
  if (!value) return undefined;
  try { const url = new URL(value); return url.protocol === "https:" ? url.href : undefined; } catch { return undefined; }
}
export function ListingCard({ item }: { item: CleanListing }) {
  const [imageFailed, setImageFailed] = useState(false);
  const image = safeUrl(item.imageUrl), url = safeUrl(item.url);
  return <article className="listing-card">
    <div className="listing-image">{image && !imageFailed ?
      // 외부 이미지는 원본 URL만 사용하며 서버 이미지 프록시를 만들지 않습니다.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt={item.title} loading="lazy" referrerPolicy="no-referrer" onError={() => setImageFailed(true)}/> : <ImageOff size={28}/>}</div>
    <div className="listing-body"><div className="flex items-center justify-between gap-2"><span className={`market-badge ${item.marketplace}`}>{MARKET_NAMES[item.marketplace]}</span>{item.excludedReason && <span className="excluded-badge">{REASONS[item.excludedReason]}</span>}</div>
      <h3>{item.title}</h3><div className="listing-price"><strong>{item.price === null ? item.priceText || "가격제안" : won(item.price)}</strong>{item.diffPercent !== null && <span className={item.diffPercent < 0 ? "below" : "above"}>{percent(item.diffPercent)}</span>}</div>
      <p className="muted text-xs truncate">{[item.location, item.postedText].filter(Boolean).join(" · ") || "원본 판매글에서 상세 정보 확인"}</p>
      {url && <a className="original-link" href={url} target="_blank" rel="noopener noreferrer">원본 보기<ArrowUpRight size={15}/></a>}
    </div>
  </article>;
}
