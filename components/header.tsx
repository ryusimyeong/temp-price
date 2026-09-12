"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartNoAxesCombined } from "lucide-react";
export function Header() {
  const path = usePathname();
  return <header className="site-header"><div className="shell header-inner">
    <Link href="/" className="brand"><span className="brand-mark"><ChartNoAxesCombined size={20}/></span>중고시세<span className="brand-caption">PRICE, IN PERSPECTIVE</span></Link>
    <nav aria-label="주 메뉴"><Link href="/" aria-current={path !== "/history" ? "page" : undefined}>시세 검색</Link><Link href="/history" aria-current={path === "/history" ? "page" : undefined}>검색 기록</Link></nav>
  </div></header>;
}
