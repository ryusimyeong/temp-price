import { Suspense } from "react";
import { Results } from "@/components/results";
export default function SearchPage() { return <main className="shell result-main"><Suspense fallback={<div className="empty-state">검색 결과를 준비하고 있습니다.</div>}><Results/></Suspense></main>; }
