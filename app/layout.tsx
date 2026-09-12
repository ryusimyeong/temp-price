import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import { Header } from "@/components/header";
import "./globals.css";
export const metadata: Metadata = { title: { default: "중고시세 — 지금, 적당한 가격", template: "%s · 중고시세" }, description: "당근과 번개장터의 매물을 모아, 지금 중고로 얼마가 적당한지 확인하세요.", robots: { index: false, follow: false } };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ko"><body><Providers><Header/>{children}<footer className="site-footer shell"><span>중고시세 <span className="muted">· 개인용 가격 리서치</span></span><span>목록에 표시된 판매 희망가 기준입니다. 실제 거래가와 다를 수 있습니다.</span></footer></Providers></body></html>;
}
