import type { Metadata } from "next";
import { History } from "@/components/history";
export const metadata: Metadata = { title: "검색 기록" };
export default function HistoryPage() { return <main className="shell history-main"><span className="eyebrow">YOUR PRICE NOTE</span><h1>다시 보는 가격의 흐름</h1><p className="muted mt-3 mb-10">지난 검색을 돌아보고, 같은 물건의 시세가 어떻게 달라졌는지 확인하세요.</p><History/></main>; }
