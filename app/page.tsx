import Link from "next/link";
import { ArrowRight, Layers3, ScanLine, ChartNoAxesCombined } from "lucide-react";
import { SearchForm } from "@/components/search-form";
import { History } from "@/components/history";
import { REGIONS } from "@/lib/regions";
export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string; region?: string }> }) {
  const params = await searchParams;
  const region = REGIONS.find(r => r.value === params.region)?.value;
  return <main className="shell home-main"><section className="hero"><div className="hero-label"><span className="status-dot"/>당근 + 번개장터, 한 번에</div><h1>지금 이 물건,<br/>중고로 <span>얼마가 적당할까?</span></h1><p className="hero-description">흩어진 매물을 모으고, 다른 물건은 걸러내고.<br className="mobile-break"/> 숫자로 확인하는 지금의 중고 시세.</p><SearchForm key={`${params.q ?? ""}:${region ?? ""}`} initialQuery={params.q?.slice(0,100)} initialRegion={region}/><div className="suggestions"><span>이렇게 검색해 보세요</span>{["아이폰 15 프로 256GB","맥북 프로 M3","PS5 Slim"].map(q => <Link href={`/?q=${encodeURIComponent(q)}`} key={q}>{q}<ArrowRight size={12}/></Link>)}</div></section>
    <div className="how-it-works">{[{Icon:Layers3,n:"01",title:"두 마켓을 한 번에",text:"마켓별 최대 100개 매물 수집"},{Icon:ScanLine,n:"02",title:"같은 물건만 골라",text:"광고·무관 상품·중복 제외"},{Icon:ChartNoAxesCombined,n:"03",title:"가격의 기준을 찾다",text:"정제평균과 가격 분포로 비교"}].map(({Icon,n,title,text}) => <div key={n}><span className="step-icon"><Icon size={21}/></span><div><h2><small>{n}</small>{title}</h2><p>{text}</p></div></div>)}</div><History preview/>
  </main>;
}
