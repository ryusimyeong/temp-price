import { NextResponse } from "next/server";
import { getHistory } from "@/lib/searches";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return NextResponse.json({ searches: await getHistory() }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "검색 기록에 연결할 수 없습니다. 잠시 뒤 다시 확인해 주세요." }, { status: 503 }); }
}
