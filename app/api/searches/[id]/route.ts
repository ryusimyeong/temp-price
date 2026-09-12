import { NextResponse } from "next/server";
import { z } from "zod";
import { getSearch } from "@/lib/searches";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "검색 기록을 찾을 수 없습니다." }, { status: 404 });
  try {
    const result = await getSearch(id);
    return result ? NextResponse.json(result, { headers: { "Cache-Control": "no-store" } }) : NextResponse.json({ error: "검색 기록을 찾을 수 없습니다." }, { status: 404 });
  } catch { return NextResponse.json({ error: "검색 기록을 불러오지 못했습니다." }, { status: 503 }); }
}
